/* Karaoke: letras (varias fuentes), romaji, traducción y aviso "canción no detectada".
   La pantalla está en view-karaoke.js. */
let _karaActive = false, _karaSel = null; // boot.js los reinicia al salir
const KR = { t: null, lines: [], synced: false, ro: [], tr: [], lang: 'es', modo: 'or', manual: false, estado: '', msg: '', tok: 0, nd: false };
const kKey = t => String((t && (t.id || (t.p && t.p[0]))) || (t && t.t) || '');
const kEnc = encodeURIComponent;

/* ---- Idioma: el del editor (t.lang) y, si no sirve, se detecta por la letra ---- */
function kLang(t, txt) {
  const h = String((t && t.lang) || '').toLowerCase();
  if (/^(ja|jp)|jap/.test(h)) return 'ja';
  if (/^ko|core/.test(h)) return 'ko';
  if (/^zh|chin/.test(h)) return 'zh';
  if (/^es|espa/.test(h)) return 'es';
  if (/^en|ingl/.test(h)) return 'en';
  if (/[\u3040-\u30ff]/.test(txt)) return 'ja';
  if (/[\uac00-\ud7af]/.test(txt)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(txt)) return 'zh';
  if (/[\u0400-\u04ff]/.test(txt)) return 'ru';
  return (/[áéíóúñ¿¡]/i.test(txt) || /\b(el|la|que|de|y|en|te|me|tu|mi|con|por)\b/i.test(txt)) ? 'es' : 'en';
}
function kModos(lang) {
  if (lang === 'es') return [['or', 'Original']];
  if (lang === 'ja') return [['all', 'Todo'], ['ro', 'Romaji'], ['tr', 'Español'], ['or', 'Original']];
  return [['all', 'Todo'], ['tr', 'Español'], ['or', 'Original']];
}
const kModoDef = lang => lang === 'es' ? 'or' : (lang === 'ja' ? 'ro' : 'tr');

/* ---- Fuentes de letras (0-2 automáticas; 3 = "otra biblioteca") ---- */
const kWeb = async u => { try { return (window.onda && onda.webJson) ? await onda.webJson(u) : null; } catch (e) { return null; } };
function kPickLrc(j) {
  if (!Array.isArray(j)) return null;
  const s = j.find(x => x && x.syncedLyrics), p = j.find(x => x && x.plainLyrics);
  if (s) return { synced: s.syncedLyrics, plain: s.plainLyrics || '' };
  return p ? { synced: '', plain: p.plainLyrics } : null;
}
const KF = [
  async n => { if (!window.onda || !onda.fetchLyrics) return null; const r = await onda.fetchLyrics(n.t, n.a, n.al, A.duration || 0); return r && (r.synced || r.plain) ? { synced: r.synced || '', plain: r.plain || '' } : null; },
  async n => kPickLrc(await kWeb('https://lrclib.net/api/search?track_name=' + kEnc(n.t) + (n.a ? '&artist_name=' + kEnc(n.a) : ''))),
  async n => kPickLrc(await kWeb('https://lrclib.net/api/search?q=' + kEnc((n.t + ' ' + n.a).trim()))),
  async n => { if (!n.a) return null; const j = await kWeb('https://api.lyrics.ovh/v1/' + kEnc(n.a) + '/' + kEnc(n.t)); return j && j.lyrics ? { synced: '', plain: String(j.lyrics) } : null; }
];
async function kBuscar(t, op, cancel) {
  op = op || {};
  const c = window.ondaCleanTrack ? ondaCleanTrack(t) : { t: t.t, a: t.a };
  let a = op.a != null ? op.a : c.a;
  if (/desconocid|unknown/i.test(a)) a = '';
  const n = { t: op.t || c.t, a, al: (t.al && !/desconocid|unknown/i.test(t.al)) ? t.al : '' };
  const fin = op.hasta != null ? op.hasta : KF.length;
  for (let i = op.desde || 0; i < fin; i++) {
    if (cancel()) return null;
    try { const r = await KF[i](n); if (cancel()) return null; if (r && (r.synced || r.plain)) return r; }
    catch (e) { console.error('[karaoke] fuente ' + i, e); }
  }
  return null;
}

/* ---- Carga ---- */
async function kCargar(t, op) {
  const my = ++KR.tok;
  KR.t = t; KR.lines = []; KR.ro = []; KR.tr = []; KR.idx = -1; KR.estado = 'buscando'; KR.msg = '';
  kPintarLetra();
  let r = null;
  try { r = await kBuscar(t, op || { hasta: 3 }, () => my !== KR.tok); } catch (e) { console.error('[karaoke] buscar', e); }
  if (my !== KR.tok) return;
  let L = [];
  if (r) {
    L = parseLrc(r.synced || '');
    KR.synced = L.length > 0;
    if (!L.length) L = String(r.plain || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).map((x, i) => ({ t: i, text: x }));
  }
  if (!L.length) { KR.estado = 'no'; kPintarLetra(); if (!KR.nd) { KR.nd = true; kNoDetectada(t); } return; }
  KR.lines = L;
  KR.lang = kLang(t, L.map(l => l.text).join(' '));
  const ms = kModos(KR.lang).map(x => x[0]);
  if (!(KR.manual && ms.includes(KR.modo))) KR.modo = kModoDef(KR.lang);
  KR.estado = 'ok';
  kPintarLetra();
  kPrep(my);
}
async function kPrep(my) {
  const need = { ro: KR.lang === 'ja' && /^(all|ro)$/.test(KR.modo), tr: KR.lang !== 'es' && /^(all|ro|tr)$/.test(KR.modo) };
  for (const k of ['ro', 'tr']) {
    if (!need[k] || KR[k].length || !window.onda) continue;
    KR.msg = k === 'ro' ? 'Preparando romaji…' : 'Traduciendo…';
    kPintarMsg();
    const out = new Array(KR.lines.length).fill('');
    let i = 0;
    const w = async () => {
      while (i < KR.lines.length && my === KR.tok) {
        const j = i++, tx = KR.lines[j].text;
        try { out[j] = (k === 'ro' ? await onda.transliterate(tx, 'ja') : await onda.translate(tx, 'es')) || ''; } catch (e) { out[j] = ''; }
      }
    };
    await Promise.all([w(), w(), w(), w()]);
    if (my !== KR.tok) return;
    KR[k] = out;
  }
  KR.msg = '';
  kPintarLetra();
}

/* ---- Pintar letra ---- */
function kPintarMsg() { const m = document.getElementById('k3-msg'); if (m) m.textContent = KR.msg; }
function kPintarLetra() {
  const ls = document.getElementById('k3-ls'), tg = document.getElementById('k3-tg');
  if (!ls) return;
  const ra = document.getElementById('k3'); if (ra) ra.dataset.modo = KR.modo;
  if (tg) {
    const ms = KR.estado === 'ok' ? kModos(KR.lang) : [];
    tg.innerHTML = ms.length > 1 ? ms.map(m => '<button data-k3="tg" data-m="' + m[0] + '" class="' + (m[0] === KR.modo ? 'on' : '') + '">' + m[1] + '</button>').join('') : '';
  }
  if (KR.estado === 'buscando') { ls.innerHTML = '<div class="k3-m"><p>Buscando letra…</p><button data-k3="cancelbus">Cancelar</button></div>'; return; }
  if (KR.estado === 'no') { ls.innerHTML = '<div class="k3-m"><p>Sin letra. La música sigue sonando.</p><button data-k3="nd">Buscar otra vez</button></div>'; return; }
  if (KR.estado !== 'ok') { ls.innerHTML = '<div class="k3-m"><p>Elige una canción</p></div>'; return; }
  ls.innerHTML = (KR.msg ? '<div class="k3-pm" id="k3-msg">' + esc(KR.msg) + '</div>' : '')
    + KR.lines.map((l, i) => '<div class="k3-ln" data-t="' + l.t + '"><span class="o">' + esc(l.text) + '</span><span class="r">' + esc(KR.ro[i] || '') + '</span><span class="e">' + esc(KR.lang === 'es' ? '' : (KR.tr[i] || '')) + '</span></div>').join('');
  KR.idx = -1; kTick();
}
function kTick() {
  if (view !== 'karaoke' || KR.estado !== 'ok' || !KR.synced) return;
  const ct = A.currentTime;
  let idx = -1;
  for (let i = 0; i < KR.lines.length; i++) { if (KR.lines[i].t <= ct) idx = i; else break; }
  if (idx === KR.idx) return;
  KR.idx = idx;
  const ls = document.getElementById('k3-ls'); if (!ls) return;
  const ln = ls.querySelectorAll('.k3-ln');
  ln.forEach((el, i) => el.classList.toggle('now', i === idx));
  if (ln[idx]) ln[idx].scrollIntoView({ block: 'center', behavior: 'smooth' });
}
const renderKaraoke = () => kTick(); // lo llama player.js
const syncKaraBar = () => { if (typeof kSync === 'function') kSync(); };

/* ---- Cambio de canción ---- */
function kCambio() {
  if (view !== 'karaoke') return;
  const t = ci >= 0 ? q[ci] : null;
  if (t === KR.t && KR.estado) return;
  KR.tok++; KR.nd = false;
  if (!t) { KR.t = null; KR.estado = ''; KR.lines = []; kPintarLetra(); return; }
  kCargar(t, { hasta: 3 });
}
['loadedmetadata', 'play', 'emptied'].forEach(ev => A.addEventListener(ev, kCambio));
A.addEventListener('timeupdate', kTick);

/* ---- Aviso "canción no detectada" ---- */
function kNoDetectada(t) {
  const old = document.getElementById('k3-nd'); if (old) old.remove();
  const c = window.ondaCleanTrack ? ondaCleanTrack(t) : { t: t.t, a: t.a };
  const d = document.createElement('dialog');
  d.id = 'k3-nd';
  d.innerHTML = '<h2>Canción no detectada</h2><p style="color:var(--dim);font-size:13px;margin:6px 0 12px">No encontré la letra. Cambia el nombre, busca en otra biblioteca o cancela.</p>'
    + '<input id="k3-nt" placeholder="Título" value="' + esc(c.t) + '"><input id="k3-na" placeholder="Artista" value="' + esc(/desconocid/i.test(c.a) ? '' : c.a) + '">'
    + '<div class="pre" style="justify-content:center;margin-top:12px"><button class="chip ed-ok" data-r="n">Buscar</button><button class="chip" data-r="o">Otra biblioteca</button><button class="chip" data-r="c">Cancelar</button></div>';
  document.body.appendChild(d);
  let fin = false;
  const cerrar = r => {
    if (fin) return; fin = true;
    const nt = d.querySelector('#k3-nt').value.trim(), na = d.querySelector('#k3-na').value.trim();
    try { d.close(); } catch (e) {} d.remove();
    if (r === 'n' && nt) { KR.nd = true; kCargar(t, { t: nt, a: na }); }
    else if (r === 'o' && nt) { KR.nd = true; kCargar(t, { t: nt, a: na, desde: 3 }); }
    /* cancelar: vale solo esta vez, la música sigue sin letra */
  };
  d.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) cerrar(b.dataset.r); });
  d.addEventListener('cancel', () => cerrar('c'));
  d.showModal();
}