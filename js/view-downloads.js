/* Vista: Descargas (MP3 desde YouTube) */
let _dlTab = 'all', _dlItems = [], _dlBound = false, _dlBusq = 0;
const DLI = {
  down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  retry: '<path d="M20 12a8 8 0 11-2.6-5.9M20 4v5h-5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  pause: '<path d="M7 5v14M17 5v14"/>',
  shuffle: '<path d="M3 7h3.5c2 0 3.2 1 4.3 2.8l2.4 4.4c1.1 1.8 2.3 2.8 4.3 2.8H21"/><path d="M18 14l3 3-3 3"/><path d="M3 17h3.5c1.1 0 2-.4 2.8-1.2"/><path d="M13 8.2C14 7.4 15.1 7 16.5 7H21"/><path d="M18 4l3 3-3 3"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>'
};
const dlIc = (n, s) => '<svg viewBox="0 0 24 24" width="' + (s || '1em') + '" height="' + (s || '1em') + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + DLI[n] + '</svg>';
const dlDur = s => { s = Math.round(+s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

async function dlRefresh() {
  if (!window.onda || !window.onda.download) return;
  try { _dlItems = await window.onda.download.history(PF); } catch (e) { console.error('[descargas] historial', e); _dlItems = []; }
  dlRender(); dlWaterSync();
}

function dlRender() {
  const box = document.getElementById('dl-list');
  if (!box) return;
  let items = _dlItems.slice();
  if (_dlTab === 'done') items = items.filter(x => x.status === 'done');
  else if (_dlTab === 'running') items = items.filter(x => x.status === 'running');
  else if (_dlTab === 'cancel') items = items.filter(x => x.status === 'cancelled' || x.status === 'error');
  if (!items.length) { box.innerHTML = '<p class="dl2-vacio">Aquí no hay descargas todavía.</p>'; return; }
  const ICO = { done: 'check', running: 'down', cancelled: 'close', error: 'warn' };
  box.innerHTML = items.map(x => {
    const pct = x.status === 'done' ? 100 : (x.progress || 0);
    const sub = esc(String(x.file || x.url || '').split(/[\\\/]/).pop()) + ' · MP3';
    let acts = '';
    if (x.status === 'running') acts += '<button class="dl2-b" data-act="cancel" title="Cancelar" aria-label="Cancelar">' + dlIc('close', '16px') + '<span>Cancelar</span></button>';
    if (x.status === 'cancelled' || x.status === 'error') acts += '<button class="dl2-b" data-act="retry" title="Reintentar" aria-label="Reintentar">' + dlIc('retry', '16px') + '<span>Reintentar</span></button>';
    if (x.status === 'done' && x.file) acts += '<button class="dl2-b danger" data-act="erase" title="Borrar el archivo (Papelera)" aria-label="Borrar el archivo">' + dlIc('trash', '16px') + '<span>Borrar archivo</span></button>';
    if (x.status !== 'running') acts += '<button class="dl2-b" data-act="remove" title="Quitar de la lista" aria-label="Quitar de la lista">' + dlIc('close', '16px') + '</button>';
    return '<div class="dl2-row" data-id="' + esc(String(x.id)) + '"><div class="dl2-ico ' + x.status + '">' + dlIc(ICO[x.status] || 'down', '20px') + '</div><div class="dl2-info"><b>' + esc(x.title || 'Descarga ' + (x.id || '')) + '</b><span>' + sub + '</span>' + (x.status === 'running' ? '<div class="dl2-bar"><i style="width:' + pct + '%"></i></div>' : '') + '</div><div class="dl2-acts">' + acts + '</div></div>';
  }).join('');
}

/* Aviso: Con portada / Sin portada / Cancelar */
function askCover() {
  return new Promise(res => {
    const old = document.getElementById('dl-cover'); if (old) old.remove();
    const d = document.createElement('dialog');
    d.id = 'dl-cover'; d.className = 'dl2-dlg';
    d.innerHTML = '<h2>Descargar MP3</h2><p>¿Incluir la portada del video en el archivo?</p><div class="pre" style="justify-content:center"><button class="chip ed-ok" data-r="cover">Con portada</button><button class="chip" data-r="nocc">Sin portada</button><button class="chip" data-r="cancel">Cancelar</button></div>';
    document.body.appendChild(d);
    let fin = false;
    const cerrar = r => { if (fin) return; fin = true; try { d.close(); } catch (e) {} d.remove(); res(r); };
    d.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) cerrar(b.dataset.r); });
    d.addEventListener('cancel', () => cerrar('cancel'));
    d.showModal();
  });
}

/* Botón de descarga: círculo que se llena como un vaso de agua */
const dlWater = vid => '<button class="dl2-water" data-vid="' + esc(vid) + '" style="--p:0%" title="Descargar" aria-label="Descargar"><i class="w"></i><span class="ic">' + dlIc('down', '18px') + '</span></button>';
function dlWaterSync() {
  document.querySelectorAll('.dl2-water').forEach(b => {
    const vid = b.dataset.vid, m = _dlItems.filter(x => x.url && String(x.url).includes(vid));
    const run = m.find(x => x.status === 'running'), done = m.find(x => x.status === 'done');
    const st = run ? 'run' : done ? 'done' : '', pct = run ? (run.progress || 0) : done ? 100 : 0;
    b.style.setProperty('--p', pct + '%');
    if ((b.dataset.st || '') !== st) {
      b.dataset.st = st;
      b.classList.toggle('run', st === 'run');
      b.classList.toggle('done', st === 'done');
      b.title = st === 'run' ? 'Cancelar descarga' : st === 'done' ? 'Descargado' : 'Descargar';
      b.querySelector('.ic').innerHTML = dlIc(st === 'done' ? 'check' : st === 'run' ? 'close' : 'down', '18px');
    }
  });
}

/* Vista previa en audio (independiente del reproductor de canciones) */
function dlPrevClose() {
  const c = document.getElementById('dl-prev'); if (!c) return;
  const a = c.querySelector('audio'); if (a) { a.pause(); a.removeAttribute('src'); }
  c.remove();
}
function dlPrevOpen(vid, title, thumb) {
  dlPrevClose();
  if (!A.paused) A.pause();
  const c = document.createElement('div');
  c.id = 'dl-prev'; c.className = 'dl2-prev';
  c.innerHTML = '<img src="' + esc(thumb) + '" alt=""><div class="pi"><div class="pt"><b>' + esc(title) + '</b><button class="dl2-b" data-pv="x" aria-label="Cerrar vista previa" title="Cerrar">' + dlIc('close', '16px') + '</button></div>'
    + '<div class="ps" id="dl-ps">Esperando a YouTube…</div>'
    + '<div class="pu" id="dl-pu" hidden><button class="dl2-circ" data-pv="pp" aria-label="Pausar">' + dlIc('pause', '16px') + '</button><div class="pb" data-pv="bar"><i></i></div><span class="tm">--:--</span></div></div><audio></audio>';
  document.body.appendChild(c);
  const au = c.querySelector('audio'), ps = c.querySelector('#dl-ps'), pu = c.querySelector('#dl-pu'), fill = c.querySelector('.pb i'), tm = c.querySelector('.tm'), pp = c.querySelector('[data-pv="pp"]');
  const f = s => (isFinite(s) && s > 0) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '--:--';
  au.ontimeupdate = () => { tm.textContent = f(au.currentTime) + ' / ' + f(au.duration); if (isFinite(au.duration) && au.duration > 0) fill.style.width = (au.currentTime / au.duration * 100) + '%'; };
  au.onended = () => { pp.innerHTML = dlIc('play', '16px'); fill.style.width = '0%'; };
  c.addEventListener('click', e => {
    const b = e.target.closest('[data-pv]'); if (!b) return;
    if (b.dataset.pv === 'x') dlPrevClose();
    else if (b.dataset.pv === 'pp') { if (au.paused) { au.play(); pp.innerHTML = dlIc('pause', '16px'); } else { au.pause(); pp.innerHTML = dlIc('play', '16px'); } }
    else if (b.dataset.pv === 'bar' && isFinite(au.duration)) { const r = b.getBoundingClientRect(); au.currentTime = (e.clientX - r.left) / r.width * au.duration; }
  });
  const to = new Promise((_, rej) => setTimeout(() => rej(new Error('YouTube tarda demasiado. Intenta de nuevo.')), 10000));
  Promise.race([window.onda.getAudioStream('https://www.youtube.com/watch?v=' + vid), to]).then(r => {
    if (!document.getElementById('dl-prev')) return; // la cerraron mientras esperaba
    if (!r || r.error || !r.streamUrl) throw new Error((r && r.error) || 'No se obtuvo el audio');
    ps.hidden = true; pu.hidden = false; au.src = r.streamUrl; au.play().catch(() => {});
  }).catch(err => { console.error('[descargas] vista previa', err); if (document.getElementById('dl-prev')) { dlPrevClose(); window.showAlert('No se pudo cargar la vista previa: ' + (err.message || err)); } });
}

function viewDownloads(v) {
  dlPrevClose();
  v.innerHTML = '<h2>Descargas</h2>'
    + '<div class="dl2-head"><input id="dl-url" type="text" placeholder="Pega una URL de YouTube o escribe para buscar…" spellcheck="false">'
    + '<button id="dl-go" class="dl2-main">' + dlIc('down', '16px') + '<span>Descargar URL</span></button></div>'
    + '<div class="dl2-aux"><button id="dl-search" class="dl2-b">' + dlIc('search', '16px') + '<span>Buscar en YouTube</span></button><button id="dl-open" class="dl2-b">' + dlIc('folder', '16px') + '<span>Abrir carpeta</span></button></div>'
    + '<div id="dl-results" class="dl2-results"></div>'
    + '<div class="dl2-panel"><h3>Historial de descargas</h3><div class="dl2-tabs">'
    + [['all', 'Todo'], ['done', 'Descargados'], ['running', 'En proceso'], ['cancel', 'Canceladas']].map(t => '<button data-dt="' + t[0] + '" class="' + (_dlTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('')
    + '</div><div id="dl-list"><p class="dl2-vacio">Cargando…</p></div></div>';
  dlBind();
  dlRefresh();
}

function dlBind() {
  const url = document.getElementById('dl-url'), go = document.getElementById('dl-go'), sBtn = document.getElementById('dl-search'), oBtn = document.getElementById('dl-open');
  const tabs = document.querySelector('.dl2-tabs'), list = document.getElementById('dl-list'), results = document.getElementById('dl-results');

  async function iniciar(u, t) {
    const ch = await askCover(); if (ch === 'cancel') return false;
    try {
      const r = await window.onda.download.start(u, PF, t || '', ch === 'cover');
      if (r && r.error) { await window.showAlert('Error: ' + r.error); return false; }
      if (r && r.duplicated) { await window.showAlert('Ya se está descargando esa canción'); return false; }
      await dlRefresh(); return true;
    } catch (e) { console.error('[descargas] iniciar', e); await window.showAlert('Error: ' + (e && e.message || e)); return false; }
  }

  go.onclick = async () => {
    const u = (url.value || '').trim(); if (!u) return;
    go.disabled = true; go.querySelector('span').textContent = 'Iniciando…';
    if (await iniciar(u, '')) url.value = '';
    go.disabled = false; go.querySelector('span').textContent = 'Descargar URL';
  };
  url.onkeydown = e => {
    if (e.key === 'Escape') { _dlBusq++; results.innerHTML = ''; return; }
    if (e.key !== 'Enter') return;
    if (/^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/i.test(url.value.trim())) go.click(); else sBtn.click();
  };

  sBtn.onclick = async () => {
    const qy = (url.value || '').trim();
    if (!qy) { url.focus(); return; }
    const my = ++_dlBusq;
    results.innerHTML = '<div class="dl2-hd">Buscando… <button class="dl2-b" data-rs="cancel">Cancelar</button></div>';
    let r = null, fallo = false;
    try { r = await window.onda.youtubeSearchList(qy); } catch (e) { console.error('[descargas] buscar', e); fallo = true; }
    if (my !== _dlBusq) return; // cancelada
    if (fallo) { results.innerHTML = '<div class="dl2-hd">No se pudo buscar. Revisa tu conexión.</div>'; return; }
    if (!r || !r.length) { results.innerHTML = '<div class="dl2-hd">Sin resultados.</div>'; return; }
    results.innerHTML = '<div class="dl2-hd">' + r.length + ' resultados</div><div class="dl2-grid">' + r.map(x =>
      '<div class="dl2-res" data-id="' + esc(x.id) + '" data-title="' + esc(x.title || '') + '"><div class="dl2-th"><img src="' + esc(x.thumb) + '" loading="lazy" alt=""><button class="dl2-pv" data-vid="' + esc(x.id) + '" title="Vista previa" aria-label="Vista previa">' + dlIc('play', '18px') + '</button>' + (x.duration ? '<span class="dl2-d">' + dlDur(x.duration) + '</span>' : '') + '</div>'
      + '<b>' + esc(x.title || '') + '</b><small>' + esc(x.channel || '') + '</small><div class="dl2-ft">' + dlWater(x.id) + '</div></div>').join('') + '</div>';
    dlWaterSync();
  };

  oBtn.onclick = () => window.onda.download.openFolder(PF);
  tabs.onclick = e => { const b = e.target.closest('[data-dt]'); if (!b) return; _dlTab = b.dataset.dt; tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); dlRender(); };

  list.onclick = async e => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const row = btn.closest('.dl2-row'); if (!row) return;
    const id = row.dataset.id, it = _dlItems.find(x => String(x.id) === id), a = btn.dataset.act;
    try {
      if (a === 'cancel') await window.onda.download.cancel(id);
      else if (a === 'remove') await window.onda.download.remove(PF, id);
      else if (a === 'retry' && it && it.url) { await window.onda.download.remove(PF, id); await iniciar(it.url, it.title); }
      else if (a === 'erase' && it && it.file) {
        if (!await window.showConfirm('¿Mandar este archivo a la Papelera de reciclaje?')) return;
        const r = await window.onda.fileDelete(PF, it.file);
        if (!r || !r.ok) { window.showAlert('No se pudo borrar: ' + ((r && r.error) || 'desconocido')); return; }
        await window.onda.download.remove(PF, id);
      }
    } catch (err) { console.error('[descargas] acción', err); window.showAlert('No se pudo completar la acción.'); }
    dlRefresh();
  };

  results.onclick = async e => {
    if (e.target.closest('[data-rs="cancel"]')) { _dlBusq++; results.innerHTML = ''; return; }
    const pv = e.target.closest('.dl2-pv');
    if (pv) { const c = pv.closest('.dl2-res'); dlPrevOpen(pv.dataset.vid, c.dataset.title, c.querySelector('img').src); return; }
    const w = e.target.closest('.dl2-water'); if (!w) return;
    const vid = w.dataset.vid, c = w.closest('.dl2-res');
    if (w.classList.contains('done')) return;
    if (w.classList.contains('run')) { const it = _dlItems.find(x => x.status === 'running' && String(x.url).includes(vid)); if (it) { await window.onda.download.cancel(it.id); dlRefresh(); } return; }
    await iniciar('https://www.youtube.com/watch?v=' + vid, c.dataset.title);
  };

  if (!_dlBound) {
    _dlBound = true;
    if (window.onda && window.onda.on) window.onda.on('download:progress', () => { if (view === 'downloads') dlRefresh(); });
  }
}