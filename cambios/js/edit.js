/* Editar canción y carátula: título, artista, álbum, género, idioma y carátula (archivo o búsqueda en línea) */
let et = null, ecv, playerHidden = false;
let _edPick = null, _edRes = [], _edTok = 0, _edDefQ = '';

const ED_LANGS = [['', 'Automático'], ['es', 'Español'], ['en', 'Inglés'], ['ja', 'Japonés'], ['ko', 'Coreano'], ['zh', 'Chino'], ['pt', 'Portugués'], ['fr', 'Francés'], ['it', 'Italiano'], ['de', 'Alemán'], ['otro', 'Otro']];
const ED_GENRES = ['Pop', 'Rock', 'Hip hop / Rap', 'Reggaetón', 'Salsa', 'Vallenato', 'Cumbia', 'Balada', 'Electrónica', 'Metal', 'Jazz', 'Clásica', 'Indie', 'R&B / Soul', 'Country', 'Latino', 'J-Pop', 'K-Pop', 'Anime', 'Banda sonora', 'Alternativa', 'Folk', 'Reggae', 'Blues', 'Punk'];
/* Géneros en inglés (como los devuelve iTunes) -> español */
const ED_GES = {
  'pop': 'Pop', 'rock': 'Rock', 'hip-hop/rap': 'Hip hop / Rap', 'hip hop/rap': 'Hip hop / Rap', 'rap': 'Rap', 'latin': 'Latino', 'latino': 'Latino',
  'alternative': 'Alternativa', 'dance': 'Dance', 'electronic': 'Electrónica', 'r&b/soul': 'R&B / Soul', 'soundtrack': 'Banda sonora', 'j-pop': 'J-Pop',
  'k-pop': 'K-Pop', 'anime': 'Anime', 'classical': 'Clásica', 'singer/songwriter': 'Cantautor', 'reggae': 'Reggae', 'reggaeton': 'Reggaetón', 'country': 'Country',
  'jazz': 'Jazz', 'metal': 'Metal', 'heavy metal': 'Metal', 'blues': 'Blues', 'folk': 'Folk', 'pop latino': 'Pop latino', 'rock latino': 'Rock latino',
  'urbano latino': 'Urbano latino', 'salsa y tropical': 'Salsa y tropical', 'regional mexicano': 'Regional mexicano', 'worldwide': 'Internacional',
  'indie pop': 'Indie Pop', 'j-rock': 'J-Rock', 'hard rock': 'Hard Rock', 'new age': 'New Age', 'christian': 'Cristiana', 'gospel': 'Gospel',
  "children's music": 'Infantil', 'holiday': 'Navideña', 'vocal': 'Vocal', 'easy listening': 'Easy listening', 'comedy': 'Comedia', 'spoken word': 'Palabra hablada'
};
window.ondaGenreEs = g => { const k = String(g || '').trim().toLowerCase(); return ED_GES[k] || String(g || '').trim(); };

/* Idioma según los caracteres y algunas palabras comunes */
function ondaDetectLang(s) {
  s = String(s || '');
  if (/[\u3040-\u30ff]/.test(s)) return 'ja';
  if (/[\uac00-\ud7af]/.test(s)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(s)) return 'zh';
  if (/[áéíóúñ¿¡]/i.test(s)) return 'es';
  const w = ' ' + ondaNorm(s).replace(/[^a-z ]/g, ' ') + ' ';
  const es = (w.match(/ (el|la|los|las|de|del|que|mi|tu|te|me|con|por|para|amor|corazon|vida|un|una|en|no|si|yo) /g) || []).length;
  const en = (w.match(/ (the|you|and|my|me|love|of|to|in|is|it|your|baby|heart|girl|night|tonight|we|i) /g) || []).length;
  if (es > en) return 'es';
  if (en > 0) return 'en';
  return '';
}
window.ondaLangOf = t => (t && t.lang) || ondaDetectLang(((t && t.t) || '') + ' ' + ((t && t.a) || ''));
function edLangName(c) { const x = ED_LANGS.find(l => l[0] === c); return x ? x[1] : ''; }
const _ic = (n, s) => (window.ic ? window.ic(n, s) : '');

function edIcons() {
  const f = $('#ed-file'); if (f) f.innerHTML = _ic('folder', '1.1em') + '<span>Elegir imagen</span>';
  $('#e8').innerHTML = _ic('search', '1.1em') + '<span>Buscar en línea</span>';
  $('#ed-go').innerHTML = _ic('search', '1.1em') + '<span>Buscar</span>';
  $('#e6').innerHTML = _ic('close', '1em');
}
function edHint() {
  const h = $('#e12h'); if (!h) return;
  if ($('#e12').value) { h.textContent = ''; return; }
  const d = ondaDetectLang($('#e1').value + ' ' + $('#e2').value);
  h.textContent = d ? ('Idioma automático: ' + edLangName(d) + '. Sirve para la letra y el karaoke.') : 'Idioma automático: no detectado. Elígelo para que el karaoke use la letra correcta.';
}
function edPaint(tmp) {
  const el = $('#ed-cv'), ph = $('#ed-cvph');
  const src = tmp || (ecv === undefined ? (et && et.cv) : ecv);
  el.style.backgroundImage = src ? 'url("' + String(src).replace(/"/g, '%22') + '")' : 'none';
  ph.style.display = src ? 'none' : '';
  ph.textContent = ((et && et.t && et.t[0]) || '♪').toUpperCase();
  $('#e6').style.display = src ? '' : 'none';
}

function openEd(t) {
  if (!t) return;
  et = t; ecv = undefined; _edPick = null; _edRes = []; ++_edTok;
  $('#e1').value = t.t || ''; $('#e2').value = t.a || ''; $('#e3').value = t.al || '';
  $('#e11').value = t.g || '';
  $('#ed-gen').innerHTML = ED_GENRES.map(g => '<option value="' + esc(g) + '">').join('');
  $('#e12').innerHTML = ED_LANGS.map(l => '<option value="' + l[0] + '">' + l[1] + '</option>').join('');
  $('#e12').value = t.lang || '';
  $('#e4').value = ''; $('#e9').value = '';
  $('#ed-res').hidden = true; $('#ed-pick').hidden = true; $('#ed-grid').innerHTML = ''; edMsg('');
  edIcons(); edHint(); edPaint();
  $('#ed').showModal();
}

function edSave() {
  if (!et) return;
  const t = ($('#e1').value || '').trim();
  if (!t) { window.showAlert('El título no puede quedar vacío.'); $('#e1').focus(); return; }
  et.t = t;
  et.a = ($('#e2').value || '').trim() || 'Artista desconocido';
  et.al = ($('#e3').value || '').trim() || 'Álbum desconocido';
  const g = ($('#e11').value || '').trim().slice(0, 40);
  if (g) et.g = g; else delete et.g;
  const lg = $('#e12').value;
  if (lg) et.lang = lg; else delete et.lang;
  if (ecv !== undefined) { if (ecv) et.cv = ecv; else delete et.cv; }
  save();
  $('#ed').close();
  if (q[ci] === et) info(et);
  render();
}

/* ---- Búsqueda de portada en línea ---- */
function edMsg(t) { const m = $('#ed-msg'); if (m) m.textContent = t || ''; }
const _ND = s => ondaNorm(String(s || '').replace(/[^\p{L}\p{N}]+/gu, ' ')).trim();
const _CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
function edHit(ns, w) {
  if (_CJK.test(w)) return ns.indexOf(w) > -1;
  return (' ' + ns + ' ').indexOf(' ' + w + ' ') > -1 || (w.length > 3 && ns.indexOf(w) > -1);
}
/* Qué parte de lo buscado aparece en el texto (0 a 1) */
function edScore(wanted, text) {
  let w = [...new Set(_ND(wanted).split(' ').filter(Boolean))];
  const good = w.filter(x => x.length > 2 || _CJK.test(x));
  if (good.length) w = good;
  if (!w.length) return 1;
  const ns = _ND(text);
  let h = 0;
  w.forEach(x => { if (edHit(ns, x)) h++; });
  return h / w.length;
}
async function edCovers(query, title, artist, custom) {
  if (!window.onda || !onda.webJson) return { err: 'nofn' };
  const enc = encodeURIComponent(query);
  const [a, b] = await Promise.all([
    onda.webJson('https://itunes.apple.com/search?term=' + enc + '&media=music&entity=song&limit=25').catch(() => null),
    onda.webJson('https://api.deezer.com/search?q=' + enc + '&limit=20').catch(() => null)
  ]);
  if (a === null && b === null) return { err: 'net' };
  const raw = [];
  ((a && a.results) || []).forEach(x => {
    if (!x.artworkUrl100) return;
    raw.push({ n: x.trackName || '', ar: x.artistName || '', al: x.collectionName || '', thumb: x.artworkUrl100.replace(/\d+x\d+bb/, '300x300bb'), full: x.artworkUrl100.replace(/\d+x\d+bb/, '800x800bb'), genre: x.primaryGenreName || '' });
  });
  ((b && b.data) || []).forEach(x => {
    const al = x.album || {};
    if (!al.cover_xl && !al.cover_big) return;
    raw.push({ n: x.title || '', ar: (x.artist && x.artist.name) || '', al: al.title || '', thumb: al.cover_medium || al.cover_big || al.cover_xl, full: al.cover_xl || al.cover_big, genre: '' });
  });
  const seen = new Set(), out = [];
  raw.forEach((x, i) => {
    let sc;
    if (custom) { sc = edScore(query, x.n + ' ' + x.ar); if (sc < 0.5) return; }
    else {
      const ts = edScore(title, x.n);
      if (ts < 0.6) return;
      const as = artist ? edScore(artist, x.ar + ' ' + x.n) : 1;
      if (as < 0.5) return;
      sc = ts * 0.6 + as * 0.4;
    }
    if (seen.has(x.thumb)) return;
    seen.add(x.thumb);
    out.push({ x, sc, i });
  });
  out.sort((p, q2) => q2.sc - p.sc || p.i - q2.i);
  return { list: out.slice(0, 12).map(o => o.x) };
}
function edOpenSearch() {
  const raw = { t: $('#e1').value, a: $('#e2').value };
  const c = window.ondaCleanTrack ? ondaCleanTrack(raw) : raw;
  const known = c.a && !/desconocid|unknown/i.test(c.a);
  _edDefQ = ((known ? c.a + ' ' : '') + c.t).trim();
  $('#ed-q').value = _edDefQ;
  $('#ed-res').hidden = false;
  edRunSearch();
}
async function edRunSearch() {
  const tok = ++_edTok;
  const query = ($('#ed-q').value || '').trim();
  if (!query) { edMsg('Escribe el artista y el título para buscar.'); return; }
  const raw = { t: $('#e1').value, a: $('#e2').value };
  const c = window.ondaCleanTrack ? ondaCleanTrack(raw) : raw;
  const known = c.a && !/desconocid|unknown/i.test(c.a);
  const custom = query !== _edDefQ;
  _edRes = []; _edPick = null;
  $('#ed-grid').innerHTML = ''; $('#ed-pick').hidden = true; edPaint();
  edMsg('Buscando…');
  $('#ed-go').disabled = true;
  let r = null;
  try { r = await edCovers(query, c.t, known ? c.a : '', custom); } catch (e) { console.error('[editor] buscar portada', e); }
  if (tok !== _edTok) return;
  $('#ed-go').disabled = false;
  if (!r || r.err === 'net') { edMsg('No hay conexión con el servidor de portadas. Revisa tu internet o pega la URL de una imagen.'); return; }
  if (r.err === 'nofn') { edMsg('Esta versión de Onda no puede buscar en línea. Pega la URL de una imagen.'); return; }
  if (!r.list.length) { edMsg('No encontré portadas que coincidan con «' + query + '». Cambia el texto y busca otra vez, o pega la URL de una imagen.'); return; }
  _edRes = r.list;
  edMsg('Elige una portada:');
  $('#ed-grid').innerHTML = r.list.map((x, i) => '<button type="button" class="rg-i" data-ri="' + i + '" title="' + esc(x.n + ' — ' + x.ar) + '"><img src="' + esc(x.thumb) + '" loading="lazy" alt=""><span>' + esc(x.n) + '</span><small>' + esc(x.ar) + '</small></button>').join('');
}
function edCloseSearch() {
  ++_edTok; _edPick = null; _edRes = [];
  $('#ed-res').hidden = true; $('#ed-pick').hidden = true; $('#ed-go').disabled = false;
  edPaint();
}
async function edFetchBlob(url) {
  if (!window.onda || !onda.fetchImage) return null;
  const g = await onda.fetchImage(url);
  if (!g) return null;
  return await (await fetch('data:' + g.type + ';base64,' + g.data)).blob();
}
async function edApplyPick() {
  const p = _edPick;
  if (!p) return;
  const ok = $('#ed-pk-ok');
  ok.disabled = true; ok.textContent = 'Guardando…';
  try {
    const b = await edFetchBlob(p.full);
    if (!b) throw new Error('sin imagen');
    ecv = await toCover(b);
    if (p.genre && !$('#e11').value.trim()) $('#e11').value = window.ondaGenreEs(p.genre);
    const al = ($('#e3').value || '').trim();
    if (p.al && (!al || /desconocid|unknown/i.test(al))) $('#e3').value = p.al;
    _edPick = null;
    edCloseSearch();
  } catch (e) {
    console.error('[editor] guardar portada', e);
    window.showAlert('No se pudo descargar esa imagen. Prueba con otra o pega su URL.');
  } finally { ok.disabled = false; ok.textContent = 'Guardar'; }
}
function edPickRes(i) {
  const x = _edRes[i];
  if (!x) return;
  _edPick = x;
  document.querySelectorAll('#ed-grid .rg-i').forEach(b => b.classList.toggle('sel', +b.dataset.ri === i));
  edPaint(x.thumb);
  $('#ed-pick').hidden = false;
}

/* ---- Eventos del editor ---- */
(() => {
  const d = document.getElementById('ed');
  if (!d) return;
  d.addEventListener('click', e => {
    const id = (e.target.closest('button,[data-ri]') || {}).id;
    const ri = e.target.closest('[data-ri]');
    if (ri) { edPickRes(+ri.dataset.ri); return; }
    if (id === 'e5') edSave();
    else if (id === 'e7') d.close();
    else if (id === 'e6') { ecv = ''; _edPick = null; $('#ed-pick').hidden = true; edPaint(); }
    else if (id === 'e8') { if ($('#ed-res').hidden) edOpenSearch(); else edCloseSearch(); }
    else if (id === 'ed-go') edRunSearch();
    else if (id === 'ed-close') edCloseSearch();
    else if (id === 'ed-pk-ok') edApplyPick();
    else if (id === 'ed-pk-no') { _edPick = null; $('#ed-pick').hidden = true; document.querySelectorAll('#ed-grid .rg-i').forEach(b => b.classList.remove('sel')); edPaint(); }
    else if (id === 'e10') {
      const u = ($('#e9').value || '').trim();
      if (!/^https?:\/\//i.test(u)) { window.showAlert('Pega una URL de imagen que empiece por http:// o https://'); return; }
      _edPick = { full: u, thumb: u, genre: '', al: '' };
      edPaint(u);
      $('#ed-pick').hidden = false;
    }
  });
  d.addEventListener('change', async e => {
    if (e.target.id === 'e12') edHint();
    if (e.target.id !== 'e4') return;
    const f = e.target.files[0];
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) { window.showAlert('Formato no admitido. Usa JPG, PNG, WEBP o GIF.'); e.target.value = ''; return; }
    if (f.size > 15 * 1024 * 1024) { window.showAlert('La imagen pesa más de 15 MB.'); e.target.value = ''; return; }
    try { ecv = await toCover(f); _edPick = null; $('#ed-pick').hidden = true; edPaint(); }
    catch (err) { console.error('[editor] leer imagen', err); window.showAlert('No se pudo leer esa imagen.'); }
    e.target.value = '';
  });
  d.addEventListener('input', e => { if (e.target.id === 'e1' || e.target.id === 'e2') edHint(); });
  d.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'ed-q') { e.preventDefault(); edRunSearch(); } });
  d.addEventListener('close', () => { ++_edTok; _edPick = null; });
})();

/* Colores de la imagen: el acento de Onda ahora es dorado fijo, ya no se pregunta */
async function extractHueAsk() {}
async function shrinkImg(f, maxW = 1920) { try { const m = await createImageBitmap(f); if (m.width <= maxW) return f; const k = maxW / m.width, cv = document.createElement('canvas'); cv.width = maxW; cv.height = Math.round(m.height * k); cv.getContext('2d').drawImage(m, 0, 0, cv.width, cv.height); return await new Promise(r => cv.toBlob(b => r(new File([b], f.name || 'bn.jpg', { type: 'image/jpeg' })), 'image/jpeg', .88)); } catch (e) { return f; } }
/* Carátula cuadrada (recorte centrado), 500 px máximo */
async function toCover(f) {
  const m = await createImageBitmap(f), lado = Math.min(m.width, m.height), sx = (m.width - lado) / 2, sy = (m.height - lado) / 2, z = Math.min(500, lado), c = document.createElement('canvas');
  c.width = z; c.height = z;
  c.getContext('2d').drawImage(m, sx, sy, lado, lado, 0, 0, z, z);
  return c.toDataURL('image/jpeg', .85);
}