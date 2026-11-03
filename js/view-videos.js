/* Vista: Biblioteca de Videos + Galeria de busqueda */
let _vidItems = [];
let _vidCurrent = null;
let _vidDls = {};
let _vidResults = [];
let _vidLoading = false;

function fmtBytes(b) {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}
function fmtDur(s) {
  s = parseInt(s) || 0;
  const m = Math.floor(s / 60), sec = s % 60;
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}
function vidUrl(p) {
  return 'onda://app/media?p=' + encodeURIComponent(p);
}
function isYouTubeUrl(v) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/i.test(v.trim());
}
function extractVideoId(v) {
  const m = v.match(/(?:v=|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

/* ---------- Sonido chime (Web Audio API) ---------- */
let _audioCtx = null;
function playChime() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.start(t); osc.stop(t + 0.8);
    });
  } catch(e) { console.warn('chime error', e); }
}

/* ---------- Toast de notificacion ---------- */
function showDlToast(title, kind) {
  const old = document.getElementById('dl-toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.id = 'dl-toast';
  toast.className = 'dl-toast';
  toast.innerHTML = `
    <div class="dl-toast-icon">${kind === 'video' ? '🎬' : '🎵'}</div>
    <div class="dl-toast-info">
      <b>${kind === 'video' ? 'Video descargado' : 'Cancion descargada'}</b>
      <span>${title || ''}</span>
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('on'));
  setTimeout(() => {
    toast.classList.remove('on');
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

/* ---------- Render de la lista (con galeria) ---------- */
function renderVideoList() {
  const box = document.getElementById('vid-list');
  if (!box) return;

  const dlHtml = Object.entries(_vidDls).map(([id, j]) => `
    <div class="vid-row vid-dl">
      <div class="vid-ico">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--acc)"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg>
      </div>
      <div class="vid-info">
        <b>${j.title || 'Descargando...'}</b>
        <span>${j.status === 'done' ? 'Completado' : j.status === 'cancelled' ? 'Cancelado' : j.status === 'error' ? 'Error' : j.progress.toFixed(1) + '%'}</span>
        ${j.status === 'running' ? `<div class="vid-bar"><i style="width:${j.progress}%"></i></div>` : ''}
      </div>
      ${j.status === 'running' ? `<button class="vid-cancel" data-cancel="${id}" title="Cancelar">✕</button>` : ''}
    </div>
  `).join('');

  // Vista de galeria (si hay resultados o esta cargando)
  if (_vidResults.length > 0 || _vidLoading) {
    box.innerHTML = dlHtml + `
      <div class="vid-search-header">
        <span>${_vidLoading ? 'Buscando...' : _vidResults.length + ' resultados'}</span>
        <button id="vid-clear" class="dl-chip">✕ Limpiar</button>
      </div>
      ${_vidLoading ? '<div class="vid-spinner"></div>' : ''}
      <div class="vid-results">
        ${_vidResults.map(r => `
          <div class="vid-card" data-vid="${r.id}" data-title="${esc(r.title)}">
            <div class="vid-thumb" style="background-image:url('${r.thumb}')"><button class="vid-card-play" data-vid="${r.id}" title="Previsualizar">▶</button>
              ${r.duration ? `<span class="vid-dur">${fmtDur(r.duration)}</span>` : ''}
            </div>
            <div class="vid-card-info">
              <b>${esc(r.title)}</b>
              <span>${esc(r.channel || '')}</span>
            </div>
            <button class="vid-card-dl" data-vid="${r.id}" title="Descargar">⬇</button>
          </div>
        `).join('')}
      </div>
    `;
    const clearBtn = document.getElementById('vid-clear');
    if (clearBtn) clearBtn.onclick = () => { _vidResults = []; _vidLoading = false; renderVideoList(); };
    box.querySelectorAll('.vid-card-play').forEach(function(btn){ btn.onclick = function(e){ e.stopPropagation(); if(window.showYouTubePreview) window.showYouTubePreview(btn.dataset.vid); }; });
    box.querySelectorAll('.vid-card-dl').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.vid;
        const card = btn.closest('.vid-card');
        const title = card ? card.dataset.title : '';
        const quality = document.getElementById('vid-quality').value;
        startVideoDownload('https://www.youtube.com/watch?v=' + id, quality, title);
      };
    });
    box.querySelectorAll('.vid-card').forEach(c => {
      c.onclick = (e) => {
        if (e.target.closest('.vid-card-dl')) return;
        const id = c.dataset.vid;
        window.onda.openExternal('https://www.youtube.com/watch?v=' + id);
      };
    });
    box.querySelectorAll('.vid-cancel').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        await window.onda.videos.downloadCancel(btn.dataset.cancel);
        delete _vidDls[btn.dataset.cancel];
        renderVideoList();
      };
    });
    return;
  }

  // Vista normal (biblioteca)
  const videosHtml = _vidItems.length ? _vidItems.map((v, i) => `
    <div class="vid-row${_vidCurrent === v.path ? ' on' : ''}" data-idx="${i}">
      <div class="vid-ico">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--acc)"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
      </div>
      <div class="vid-info">
        <b>${v.name}</b>
        <span>${v.ext.toUpperCase()} · ${fmtBytes(v.size)}</span>
      </div><button class="vid-del" data-del="${v.path}" data-name="${v.name}" title="Borrar del disco">🗑</button>
    </div>
  `).join('') : '<div style="text-align:center;padding:40px 20px;color:var(--dim)"><p style="margin:0;font-size:13px">No hay videos aun.<br>Usa "Buscar / Descargar" o añade una carpeta.</p></div>';

  box.innerHTML = dlHtml + videosHtml;
  box.querySelectorAll('.vid-del').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const path = btn.dataset.del;
      const name = btn.dataset.name;
      if (!await window.showConfirm('¿Borrar "' + name + '" del disco?\n\nEl archivo se enviará a la papelera de reciclaje.')) return;
      try {
        const r = await window.onda.videos.delete(path);
        if (r && r.ok) {
          if (_vidCurrent === path) {
            _vidCurrent = null;
            const player = document.getElementById('vid-player');
            if (player) player.innerHTML = '<div class="vid-empty"><svg viewBox="0 0 24 24" width="4em" height="4em" fill="var(--dim)"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg><p style="margin:0">Selecciona un video para reproducir</p></div>';
          }
          await refreshVideos();
        } else {
          await window.showAlert('Error al borrar: ' + (r.error || 'desconocido'));
        }
      } catch (err) {
        await window.showAlert('Error: ' + (err && err.message || err));
      }
    };
  });
  box.querySelectorAll('.vid-row[data-idx]').forEach(row => {
    row.onclick = () => playVideo(_vidItems[parseInt(row.dataset.idx, 10)]);
  });
  box.querySelectorAll('.vid-cancel').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      await window.onda.videos.downloadCancel(btn.dataset.cancel);
      delete _vidDls[btn.dataset.cancel];
      renderVideoList();
    };
  });
}

function playVideo(v) {
  if (!v) return;
  _vidCurrent = v.path;
  const player = document.getElementById('vid-player');
  if (!player) return;
  player.innerHTML = `<video id="vid-player-el" src="${vidUrl(v.path)}" controls autoplay preload="metadata"></video>`;
  document.querySelectorAll('.vid-row').forEach(r => r.classList.remove('on'));
  const row = document.querySelector(`.vid-row[data-idx="${_vidItems.indexOf(v)}"]`);
  if (row) row.classList.add('on');
}

async function refreshVideos() {
  if (!window.onda || !window.onda.videos) return;
  try {
    _vidItems = await window.onda.videos.scan();
    renderVideoList();
  } catch (e) { console.error(e); }
}

async function handleSearch(query) {
  _vidResults = [];
  _vidLoading = true;
  renderVideoList();
  
  try {
    const r = await window.onda.youtubeSearchList(query);
    _vidResults = Array.isArray(r) ? r : [];
  } catch (e) { _vidResults = []; }
  _vidLoading = false;
  renderVideoList();
}

async function startVideoDownload(url, quality, title) {
  if (!url) return;
  try {
    const r = await window.onda.videos.download(url, quality, null);
    if (r && r.error) await window.showAlert('Error: ' + r.error);
    else if (r && r.duplicated) await window.showAlert('Ya se esta descargando');
    else if (r && r.id) {
      _vidDls[r.id] = { title: title || 'Iniciando...', progress: 0, status: 'running' };
      renderVideoList();
    }
  } catch (e) { await window.showAlert('Error: ' + (e && e.message || e)); }
}

function viewVideos(v) {
  v.innerHTML = `
    <h2 style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <span>Videos</span>
      <span style="display:flex;gap:8px">
        <button id="vid-manage" class="dl-chip" title="Gestionar carpetas">⚙ Carpetas</button>
        <button id="vid-add" class="dl-main">+ Añadir carpeta</button>
      </span>
    </h2>

    <div class="vid-downloader">
      <input id="vid-url" type="text" placeholder="Pega URL de YouTube o escribe para buscar..." spellcheck="false">
      <select id="vid-quality">
        <option value="best">Mejor</option>
        <option value="1080">1080p</option>
        <option value="720" selected>720p</option>
        <option value="480">480p</option>
      </select>
      <button id="vid-dl-btn" class="dl-main">🔍 Buscar / ⬇ Descargar</button>
    </div>

    <div class="dl-head" style="margin-bottom:14px">
      <input id="vid-search" type="search" placeholder="Buscar en tu biblioteca..." spellcheck="false">
    </div>
    <div class="vid-layout">
      <div id="vid-list" class="vid-list">
        <p style="color:var(--dim);text-align:center;padding:40px">Cargando videos...</p>
      </div>
      <div id="vid-player" class="vid-player">
        <div class="vid-empty">
          <svg viewBox="0 0 24 24" width="4em" height="4em" fill="var(--dim)"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          <p style="margin:0">Selecciona un video para reproducir</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('vid-add').onclick = async () => {
    const btn = document.getElementById('vid-add');
    btn.disabled = true; btn.textContent = 'Abriendo...';
    try {
      const dir = await window.onda.videos.addFolder();
      if (dir) { btn.textContent = 'Escaneando...'; await refreshVideos(); }
    } catch (e) { console.error(e); }
    btn.disabled = false; btn.textContent = '+ Añadir carpeta';
  };

  document.getElementById('vid-manage').onclick = async () => {
    const folders = await window.onda.videos.getFolders();
    if (!folders.length) { await window.showAlert('No hay carpetas añadidas.'); return; }
    const lista = folders.map((f, i) => (i + 1) + '. ' + f).join('\n');
    const resp = prompt('Carpetas:\n\n' + lista + '\n\nNumero a quitar (o cancelar):');
    if (resp) {
      const idx = parseInt(resp, 10) - 1;
      if (idx >= 0 && idx < folders.length) {
        await window.onda.videos.removeFolder(folders[idx]);
        await refreshVideos();
      }
    }
  };

  document.getElementById('vid-search').oninput = (e) => {
    const val = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.vid-row[data-idx]').forEach(r => {
      r.style.display = r.textContent.toLowerCase().includes(val) ? '' : 'none';
    });
  };

  const dlBtn = document.getElementById('vid-dl-btn');
  const urlInput = document.getElementById('vid-url');
  const doAction = () => {
    const val = urlInput.value.trim();
    if (!val) return;
    const quality = document.getElementById('vid-quality').value;
    if (isYouTubeUrl(val)) {
      const vid = extractVideoId(val);
      startVideoDownload(vid ? 'https://www.youtube.com/watch?v=' + vid : val, quality, '');
      urlInput.value = '';
    } else {
      handleSearch(val);
    }
  };
  dlBtn.onclick = doAction;
  urlInput.onkeydown = (e) => { if (e.key === 'Enter') doAction(); };

  refreshVideos().then(() => {
    if (_vidCurrent) {
      const found = _vidItems.find(x => x.path === _vidCurrent);
      if (found) playVideo(found);
    }
  });
}

/* ---------- Listeners globales ---------- */
if (!window._vidProgressBound && window.onda && window.onda.on) {
  window._vidProgressBound = true;
  window._notifiedIds = new Set();

  const onDone = (kind) => (p) => {
    if (!p) return;
    if (kind === 'video') {
      _vidDls[p.id] = { title: p.title || 'Video', progress: p.progress || 0, status: p.status || 'running' };
      if (view === 'videos') renderVideoList();
    }
    if (p.status === 'done' && !window._notifiedIds.has(p.id)) {
      window._notifiedIds.add(p.id);
      playChime();
      showDlToast(p.title || '', kind);
      if (window.onda.notify) window.onda.notify(p.title || 'Descarga completada', kind);
      if (kind === 'video') {
        setTimeout(() => {
          delete _vidDls[p.id];
          if (view === 'videos') refreshVideos();
        }, 1500);
      }
    }
  };

  window.onda.on('video:progress', onDone('video'));
  window.onda.on('download:progress', onDone('audio'));
}

setInterval(() => {
  if (typeof view !== 'undefined' && view === 'videos' && _vidCurrent && !document.querySelector('#vid-player video')) {
    const found = _vidItems.find(x => x.path === _vidCurrent);
    if (found) playVideo(found);
  }
}, 500);
