/* Vista: Videos (YouTube interno): chips de idioma y género, aleatorio, rejilla, vista previa y descarga con calidades */
let _vidItems = [], _vidDls = {}, _vidRes = [], _vidAll = [], _vidLoading = false, _vidTok = 0;
let _vidLang = '', _vidGen = '', _vidJobs = {}, _vidDone = new Set(), _vidPrevId = null, _vidLocal = null;
const VLANG = ['Español', 'Inglés', 'Japonés', 'Coreano', 'Portugués'];
const VGEN = ['Pop', 'Rock', 'Reggaeton', 'Salsa', 'Balada', 'Rap', 'Electrónica', 'Cumbia', 'Anime'];
const VQ = [['best', 'Mejor', 12], ['1080', '1080p', 9], ['720', '720p', 5], ['480', '480p', 2.8]]; // MB por minuto aprox.

function fmtBytes(b) {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}
function fmtDur(s) { s = parseInt(s) || 0; const m = Math.floor(s / 60), sec = s % 60; return m + ':' + (sec < 10 ? '0' : '') + sec; }
const vidUrl = p => 'onda://app/media?p=' + encodeURIComponent(p);
const isYouTubeUrl = v => /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/i.test(v.trim());
const isDriveUrl = v => /^(https?:\/\/)?(drive\.google\.com\/file\/d\/)/i.test(v.trim());
const vdPeso = (min, dur) => dur ? '≈ ' + fmtBytes(Math.round(min * (dur / 60) * 1048576)) : '';

function vdCard(r) {
  const opts = VQ.map(q => '<option value="' + q[0] + '"' + (q[0] === '720' ? ' selected' : '') + '>' + q[1] + (r.duration ? ' · ' + vdPeso(q[2], r.duration) : '') + '</option>').join('');
  return '<div class="vd-card' + (_vidPrevId === r.id ? ' on' : '') + '" data-vid="' + esc(r.id) + '" data-title="' + esc(r.title || '') + '">'
    + '<div class="vd-th" style="background-image:url(\'' + esc(r.thumb || '') + '\')"><button class="vd-pv" data-a="prev" title="Vista previa" aria-label="Vista previa">' + dlIc('play', '20px') + '</button>' + (r.duration ? '<span class="vd-d">' + fmtDur(r.duration) + '</span>' : '') + '</div>'
    + '<b>' + esc(r.title || '') + '</b><small>' + esc(r.channel || '') + '</small>'
    + '<div class="vd-ft"><select class="vd-q" aria-label="Calidad">' + opts + '</select>' + vdWater(r.id) + '</div></div>';
}
const vdWater = vid => '<button class="dl2-water" data-a="dl" data-vid="' + esc(vid) + '" style="--p:0%" title="Descargar" aria-label="Descargar"><i class="w"></i><span class="ic">' + dlIc('down', '18px') + '</span></button>';
function vdWaterSync() {
  document.querySelectorAll('#vd-res .dl2-water').forEach(b => {
    const vid = b.dataset.vid, j = _vidDls[_vidJobs[vid]];
    const st = (j && j.status === 'running') ? 'run' : (_vidDone.has(vid) ? 'done' : '');
    b.style.setProperty('--p', st === 'run' ? (j.progress || 0) + '%' : st === 'done' ? '100%' : '0%');
    if ((b.dataset.st || '') !== st) {
      b.dataset.st = st; b.classList.toggle('run', st === 'run'); b.classList.toggle('done', st === 'done');
      b.title = st === 'run' ? 'Cancelar descarga' : st === 'done' ? 'Descargado' : 'Descargar';
      b.querySelector('.ic').innerHTML = dlIc(st === 'done' ? 'check' : st === 'run' ? 'close' : 'down', '18px');
    }
  });
}

/* ---- Vista previa: independiente del reproductor de canciones ---- */
function vdPrevClose() {
  const p = document.getElementById('vd-prev'); if (p) { p.innerHTML = ''; p.hidden = true; }
  _vidPrevId = null; _vidLocal = null;
  document.querySelectorAll('.vd-card.on,.vd-loc.on').forEach(x => x.classList.remove('on'));
}
function vdPrevOpen(r) {
  const p = document.getElementById('vd-prev'); if (!p) return;
  if (!A.paused) A.pause();
  _vidPrevId = r.id; _vidLocal = null;
  p.hidden = false;
  p.innerHTML = '<button class="dl2-b vd-x" data-a="xprev" aria-label="Cerrar vista previa" title="Cerrar">' + dlIc('close', '16px') + '</button>'
    + '<webview src="https://www.youtube.com/watch?v=' + encodeURIComponent(r.id) + '&autoplay=1" useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" httpreferrer="https://www.youtube.com/" style="width:100%;height:100%;border:0"></webview>'
    + '<div class="vd-pt">' + esc(r.title || '') + '</div>';
  document.querySelectorAll('.vd-card').forEach(c => c.classList.toggle('on', c.dataset.vid === r.id));
  p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function vdLocalOpen(v) {
  const p = document.getElementById('vd-prev'); if (!p) return;
  if (!A.paused) A.pause();
  _vidPrevId = null; _vidLocal = v.path;
  p.hidden = false;
  p.innerHTML = '<button class="dl2-b vd-x" data-a="xprev" aria-label="Cerrar" title="Cerrar">' + dlIc('close', '16px') + '</button><video src="' + vidUrl(v.path) + '" controls autoplay style="width:100%;height:100%"></video><div class="vd-pt">' + esc(v.name) + '</div>';
  document.querySelectorAll('.vd-loc').forEach(c => c.classList.toggle('on', c.dataset.path === v.path));
}

/* ---- Búsqueda ---- */
function vdFiltrar() {
  const f = document.getElementById('vd-dur'), mx = f && f.value !== 'all' ? parseInt(f.value, 10) : 0;
  _vidRes = (mx ? _vidAll.filter(v => !v.duration || v.duration <= mx) : _vidAll).slice(0, 24);
  vdPintar();
}
function vdPintar() {
  const box = document.getElementById('vd-res'); if (!box) return;
  if (_vidLoading) { box.innerHTML = '<div class="dl2-hd">Buscando… <button class="dl2-b" data-a="xbus">Cancelar</button></div>'; return; }
  if (!_vidRes.length) { box.innerHTML = _vidAll.length ? '<div class="dl2-hd">Ningún video cumple ese filtro.</div>' : ''; return; }
  box.innerHTML = '<div class="vd-grid">' + _vidRes.map(vdCard).join('') + '</div>';
  vdWaterSync();
}
async function vdBuscar(query, auto) {
  const my = ++_vidTok;
  _vidLoading = true; _vidRes = []; _vidAll = []; vdPintar();
  try {
    if (isDriveUrl(query)) _vidAll = [{ id: 'drive', title: 'Video de Drive', channel: 'Google Drive', duration: 0, thumb: '', url: query }];
    else _vidAll = (await window.onda.youtubeSearchList(query)) || [];
  } catch (e) { console.error('[videos] buscar', e); if (my === _vidTok) { _vidLoading = false; _vidAll = []; const b = document.getElementById('vd-res'); if (b) b.innerHTML = '<div class="dl2-hd">No se pudo buscar. Revisa tu conexión.</div>'; } return; }
  if (my !== _vidTok) return; // cancelada
  _vidLoading = false; vdFiltrar();
  if (auto && _vidRes.length) vdPrevOpen(_vidRes[Math.floor(Math.random() * _vidRes.length)]); // Aleatorio: abre uno al azar
}
const vdQuery = (g, l) => (g + ' ' + (l === 'Español' ? 'en español' : l) + ' video oficial').replace(/\s+/g, ' ').trim();
function vdAleatorio() {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const g = _vidGen || pick(VGEN), l = _vidLang || pick(VLANG);
  vdBuscar(vdQuery(g, l), true);
}

async function startVideoDownload(url, quality, title, vid) {
  if (!url) return;
  const r = await window.onda.videos.download(url, quality, null);
  if (r && r.error) { await window.showAlert('Error: ' + r.error); throw new Error(r.error); }
  if (r && r.duplicated) { await window.showAlert('Ya se está descargando'); throw new Error('dup'); }
  if (r && r.id) {
    _vidDls[r.id] = { title: title || 'Iniciando…', progress: 0, status: 'running', quality: quality === 'best' ? 'Mejor' : quality + 'p' };
    if (vid) _vidJobs[vid] = r.id;
    vdLista(); vdWaterSync();
  }
}

/* ---- Descargas en curso + biblioteca local ---- */
function vdLista() {
  const box = document.getElementById('vd-list'); if (!box) return;
  const dl = Object.entries(_vidDls).map(([id, j]) => '<div class="dl2-row" id="dl-row-' + esc(id) + '"><div class="dl2-ico ' + j.status + '">' + dlIc(j.status === 'done' ? 'check' : j.status === 'running' ? 'down' : 'warn', '20px') + '</div><div class="dl2-info"><b>' + esc(j.title || 'Descargando…') + '</b><span id="dl-text-' + esc(id) + '">' + (j.status === 'done' ? 'Completado' : j.status === 'cancelled' ? 'Cancelado' : j.status === 'error' ? 'Error' : (j.progress || 0).toFixed(1) + '%') + '</span>' + (j.status === 'running' ? '<div class="dl2-bar"><i id="dl-bar-' + esc(id) + '" style="width:' + (j.progress || 0) + '%"></i></div>' : '') + '</div><div class="dl2-acts">'
    + (j.status === 'running' ? '<button class="dl2-b" data-a="cancel" data-id="' + esc(id) + '" aria-label="Cancelar">' + dlIc('close', '16px') + '<span>Cancelar</span></button>' : '<button class="dl2-b" data-a="quitar" data-id="' + esc(id) + '" aria-label="Quitar">' + dlIc('close', '16px') + '</button>')
    + '</div></div>').join('');
  const loc = _vidItems.map((v, i) => '<div class="dl2-row vd-loc' + (_vidLocal === v.path ? ' on' : '') + '" data-idx="' + i + '" data-path="' + esc(v.path) + '"><div class="dl2-ico done">' + dlIc('video', '20px') + '</div><div class="dl2-info"><b>' + esc(v.name) + '</b><span>' + esc(v.ext.toUpperCase()) + ' · ' + fmtBytes(v.size) + '</span></div><div class="dl2-acts"><button class="dl2-b danger" data-a="erase" data-idx="' + i + '" aria-label="Borrar" title="Borrar (Papelera)">' + dlIc('trash', '16px') + '</button></div></div>').join('');
  box.innerHTML = dl + loc || '<p class="dl2-vacio">No hay videos locales ni descargas. Busca uno o añade una carpeta.</p>';
}
async function refreshVideos() {
  if (!window.onda || !window.onda.videos) return;
  try { _vidItems = await window.onda.videos.scan(); } catch (e) { console.error('[videos] escanear', e); _vidItems = []; }
  vdLista();
}

function viewVideos(v) {
  v.innerHTML = '<div id="vd"><h2 class="vd-h"><span>Videos</span><span class="vd-hb"><button id="vd-open" class="dl2-b">' + dlIc('folder', '16px') + '<span>Abrir carpeta</span></button><button id="vd-add" class="dl2-main">' + dlIc('plus', '16px') + '<span>Añadir carpeta</span></button></span></h2>'
    + '<div class="vd-bar"><input id="vd-url" type="text" placeholder="Pega una URL o busca…" spellcheck="false">'
    + '<button class="dl2-circ" id="vd-go" title="Buscar o descargar" aria-label="Buscar o descargar">' + dlIc('search', '18px') + '</button>'
    + '<button class="dl2-circ" id="vd-rnd" title="Aleatorio (usa el idioma y género elegidos)" aria-label="Aleatorio">' + dlIc('shuffle', '18px') + '</button></div>'
    + '<div class="vd-chips" id="vd-cl">' + VLANG.map(x => '<button data-l="' + x + '" class="' + (_vidLang === x ? 'on' : '') + '">' + x + '</button>').join('') + '</div>'
    + '<div class="vd-chips" id="vd-cg">' + VGEN.map(x => '<button data-g="' + x + '" class="' + (_vidGen === x ? 'on' : '') + '">' + x + '</button>').join('') + '<select id="vd-dur" aria-label="Duración"><option value="all">Cualquier duración</option><option value="300">Máx 5 min</option><option value="900">Máx 15 min</option><option value="1800">Máx 30 min</option><option value="3600">Máx 1 hora</option></select></div>'
    + '<div id="vd-prev" class="vd-prev" hidden></div><div id="vd-res"></div>'
    + '<div class="dl2-panel"><h3>Biblioteca local y descargas</h3><div id="vd-list"></div></div></div>';

  const $i = id => document.getElementById(id);
  $i('vd-add').onclick = async () => { const d = await window.onda.videos.addFolder(); if (d) await refreshVideos(); };
  $i('vd-open').onclick = async () => { try { const f = await window.onda.videos.getFolders(); const d = f && f[0] && (f[0].path || f[0]); if (d) window.onda.videos.openFolder(d); else window.showAlert('Aún no hay carpetas de videos. Usa «Añadir carpeta».'); } catch (e) { console.error(e); } };

  const limpiar = () => { _vidTok++; _vidLoading = false; _vidAll = []; _vidRes = []; $i('vd-url').value = ''; vdPrevClose(); vdPintar(); };
  const buscarChips = () => { if (_vidLang || _vidGen) vdBuscar(vdQuery(_vidGen, _vidLang), false); else limpiar(); };
  const accion = () => {
    const val = $i('vd-url').value.trim();
    if (!val) { buscarChips(); return; }
    if (isYouTubeUrl(val) || isDriveUrl(val)) {
      startVideoDownload(val, '720', 'Video').then(() => { $i('vd-url').value = ''; }).catch(() => {});
    } else vdBuscar(val, false);
  };
  $i('vd-go').onclick = accion;
  $i('vd-rnd').onclick = vdAleatorio;
  $i('vd-url').onkeydown = e => { if (e.key === 'Enter') accion(); if (e.key === 'Escape') limpiar(); };
  $i('vd-dur').onchange = () => { if (_vidAll.length) vdFiltrar(); };
  $i('vd-cl').onclick = e => { const b = e.target.closest('[data-l]'); if (!b) return; _vidLang = _vidLang === b.dataset.l ? '' : b.dataset.l; $i('vd-cl').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.l === _vidLang)); buscarChips(); };
  $i('vd-cg').onclick = e => { const b = e.target.closest('[data-g]'); if (!b) return; _vidGen = _vidGen === b.dataset.g ? '' : b.dataset.g; $i('vd-cg').querySelectorAll('button[data-g]').forEach(x => x.classList.toggle('on', x.dataset.g === _vidGen)); buscarChips(); };

  $i('vd').onclick = async e => {
    const rowL = e.target.closest('.vd-loc');
    if (rowL && !e.target.closest('[data-a]')) { const it = _vidItems[+rowL.dataset.idx]; if (it) vdLocalOpen(it); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a, card = b.closest('.vd-card');
    try {
      if (a === 'xbus') { _vidTok++; _vidLoading = false; vdPintar(); }
      else if (a === 'xprev') vdPrevClose();
      else if (a === 'prev' && card) { const r = _vidRes.find(x => x.id === card.dataset.vid); if (r) vdPrevOpen(r); }
      else if (a === 'dl' && card) {
        const vid = b.dataset.vid;
        if (b.classList.contains('done')) return;
        if (b.classList.contains('run')) { await window.onda.videos.downloadCancel(_vidJobs[vid]); delete _vidDls[_vidJobs[vid]]; vdLista(); vdWaterSync(); return; }
        const r = _vidRes.find(x => x.id === vid), url = (r && r.url) || ('https://www.youtube.com/watch?v=' + vid);
        await startVideoDownload(url, card.querySelector('.vd-q').value, card.dataset.title, vid);
      }
      else if (a === 'cancel') { await window.onda.videos.downloadCancel(b.dataset.id); delete _vidDls[b.dataset.id]; vdLista(); vdWaterSync(); }
      else if (a === 'quitar') { delete _vidDls[b.dataset.id]; vdLista(); }
      else if (a === 'erase') {
        const it = _vidItems[+b.dataset.idx]; if (!it) return;
        if (!await window.showConfirm('¿Mandar "' + it.name + '" a la Papelera de reciclaje?')) return;
        const r = await window.onda.videos.delete(it.path);
        if (r && r.ok === false) { window.showAlert('No se pudo borrar: ' + (r.error || 'desconocido')); return; }
        if (_vidLocal === it.path) vdPrevClose();
        await refreshVideos();
      }
    } catch (err) { if (!err || err.message !== 'dup') console.error('[videos] acción', err); }
  };
  vdPintar(); vdLista(); vdWaterSync();
  refreshVideos();
}

if (!window._vidProgressBound && window.onda && window.onda.on) {
  window._vidProgressBound = true;
  window.onda.on('video:progress', p => {
    if (!p) return;
    const nueva = !_vidDls[p.id];
    _vidDls[p.id] = Object.assign(_vidDls[p.id] || {}, { title: p.title || (_vidDls[p.id] && _vidDls[p.id].title) || 'Video', progress: p.progress || 0, status: p.status || 'running', quality: p.quality || '' });
    if (p.status === 'done') for (const k in _vidJobs) if (_vidJobs[k] === p.id) _vidDone.add(k);
    if (view === 'videos') {
      const bar = document.getElementById('dl-bar-' + p.id), text = document.getElementById('dl-text-' + p.id);
      if (bar && text && p.status === 'running' && !nueva) { bar.style.width = p.progress + '%'; text.textContent = p.progress.toFixed(1) + '%'; }
      else vdLista();
      vdWaterSync();
    }
    if (p.status === 'done') setTimeout(() => { delete _vidDls[p.id]; if (view === 'videos') { refreshVideos(); vdWaterSync(); } }, 2000);
  });
}