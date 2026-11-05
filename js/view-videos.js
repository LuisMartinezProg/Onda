/* Vista: Biblioteca de Videos */
let _vidItems = [];
let _vidCurrent = null;
let _vidDls = {};
let _vidResults = [];
let _vidLoading = false;
let _vidIndex = 0;

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
function isDriveUrl(v) {
  return /^(https?:\/\/)?(drive\.google\.com\/file\/d\/)/i.test(v.trim());
}
function extractVideoId(v) {
  const m = v.match(/(?:v=|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

function buildSearchCard(r) {
  const fullUrl = r.url || ('https://www.youtube.com/watch?v=' + r.id);
  return `<div class="vid-search-card" data-vid="${r.id}" data-url="${fullUrl}" data-title="${esc(r.title)}">
    <div class="vid-search-thumb" style="background-image:url('${r.thumb}')">
      ${r.duration ? `<span class="vid-dur">${fmtDur(r.duration)}</span>` : ''}
    </div>
    <div class="vid-search-body">
      <b>${esc(r.title)}</b>
      <span>${esc(r.channel || '')}</span>
      <button class="vid-search-dl" data-vid="${r.id}">⬇ Descargar</button>
    </div>
  </div>`;
}

function renderVideoList() {
  const box = document.getElementById('vid-list');
  if (!box) return;

  const searching = (_vidResults.length > 0 || _vidLoading);

  const topRow = document.querySelector('.vid-top-row');
  if (topRow) {
    if (searching) topRow.classList.add('searching');
    else topRow.classList.remove('searching');
  }

  const backBtn = document.getElementById('vid-back-btn');
  if (backBtn) {
    backBtn.style.display = searching ? 'block' : 'none';
  }

  const featured = document.getElementById('vid-featured');
  if (featured) {
    if (searching && _vidIndex > 0 && _vidResults[_vidIndex - 1] && !_vidLoading) {
      featured.innerHTML = buildSearchCard(_vidResults[_vidIndex - 1]);
      featured.style.display = 'block';
      featured.onclick = () => { _vidIndex--; renderVideoList(); };
    } else {
      featured.innerHTML = '';
      featured.style.display = 'none';
    }
  }

  const player = document.getElementById('vid-player');
  if (player) {
    if (searching && _vidResults[_vidIndex] && !_vidLoading) {
      player.innerHTML = buildSearchCard(_vidResults[_vidIndex]);
    } else if (!searching) {
      player.style.transform = 'translateX(0)';
      if (_vidCurrent) {
        const v = _vidItems.find(x => x.path === _vidCurrent);
        if (v) {
          player.innerHTML = `<video src="${vidUrl(v.path)}" controls autoplay></video>`;
        } else {
          player.innerHTML = '<div class="vid-empty"><svg viewBox="0 0 24 24" width="4em" height="4em" fill="var(--dim)"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg><p style="margin:0">Selecciona un video</p></div>';
        }
      } else {
        player.innerHTML = '<div class="vid-empty"><svg viewBox="0 0 24 24" width="4em" height="4em" fill="var(--dim)"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg><p style="margin:0">Selecciona un video</p></div>';
      }
    }
  }

  const nextBox = document.getElementById('vid-next');
  if (nextBox) {
    if (searching && _vidIndex < _vidResults.length - 1 && _vidResults[_vidIndex + 1] && !_vidLoading) {
      nextBox.innerHTML = buildSearchCard(_vidResults[_vidIndex + 1]);
      nextBox.style.display = 'block';
      nextBox.onclick = () => { _vidIndex++; renderVideoList(); };
    } else {
      nextBox.innerHTML = '';
      nextBox.style.display = 'none';
    }
  }

  const dlHtml = Object.entries(_vidDls).map(([id, j]) => `
    <div class="vid-row vid-dl">
      <div class="vid-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="var(--acc)"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg></div>
      <div class="vid-info">
        <b>${j.title || 'Descargando...'}</b>
        <span>${j.status === 'done' ? 'Completado' : j.status === 'cancelled' ? 'Cancelado' : j.status === 'error' ? 'Error' : j.progress.toFixed(1) + '%'}</span>
        ${j.status === 'running' ? `<div class="vid-bar"><i style="width:${j.progress}%"></i></div>` : ''}
      </div>
      ${j.status === 'running' ? `<button class="vid-cancel" data-cancel="${id}">✕</button>` : ''}
      ${(j.status === 'cancelled' || j.status === 'error') ? `<button class="vid-del" data-vid-del="${id}">🗑</button>` : ''}
    </div>
  `).join('');

  const localHtml = _vidItems.length ? _vidItems.map((v, i) => `
    <div class="vid-hud-card ${_vidCurrent === v.path ? 'on' : ''}" data-idx="${i}">
      <div class="vid-hud-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="var(--acc)"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></div>
      <div class="vid-hud-info"><b>${v.name}</b><span>${v.ext.toUpperCase()} · ${fmtBytes(v.size)}</span></div>
      <button class="vid-hud-del" data-del="${v.path}" data-name="${esc(v.name)}">🗑</button>
    </div>
  `).join('') : '';

  const isBaseEmpty = _vidItems.length === 0 && Object.keys(_vidDls).length === 0;
  const baseEmptyHtml = isBaseEmpty ? `<div style="width:100%; text-align:center; color:var(--dim); font-size:12px; padding:20px;">No hay videos locales ni descargas recientes.</div>` : '';

  const isEmpty = !searching && !_vidItems.length && Object.keys(_vidDls).length === 0;
  const emptyHtml = isEmpty ? `
    <div class="vid-empty-zone">
      <div class="vid-empty-glow"><svg viewBox="0 0 24 24" width="40" height="40" fill="var(--acc)"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></div>
      <h3>Sin videos</h3>
      <p>Busca o añade una carpeta.</p>
    </div>
  ` : '';

  box.innerHTML = dlHtml + localHtml + baseEmptyHtml + emptyHtml;

  // Listeners para las tarjetas
  [featured, player, nextBox].forEach(container => {
    if (!container) return;
    
    // LISTENER DE DESCARGA
    const dlBtn = container.querySelector('.vid-search-dl');
    if (dlBtn) {
      // Detenemos el arrastre desde el pointerdown
      dlBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      
      dlBtn.onclick = async (e) => {
        e.stopPropagation();
        const originalText = dlBtn.textContent;
        dlBtn.textContent = '⏳ En cola...';
        dlBtn.disabled = true;
        
        try {
          await startVideoDownload('https://www.youtube.com/watch?v=' + dlBtn.dataset.vid, document.getElementById('vid-quality').value, '');
          if (document.body.contains(dlBtn)) dlBtn.textContent = '✓ Iniciado';
        } catch (err) {
          if (document.body.contains(dlBtn)) {
            dlBtn.textContent = '❌ Error';
            dlBtn.disabled = false;
            setTimeout(() => {
              if (document.body.contains(dlBtn)) {
                dlBtn.textContent = originalText;
                dlBtn.disabled = false;
              }
            }, 3000);
          }
        }
      };
    }
  });

  box.querySelectorAll('.vid-hud-card').forEach(card => {
    card.onclick = () => playVideo(_vidItems[parseInt(card.dataset.idx, 10)]);
  });
  box.querySelectorAll('.vid-hud-del').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      if (!await window.showConfirm('¿Borrar "' + btn.dataset.name + '" del disco?')) return;
      await window.onda.videos.delete(btn.dataset.del);
      if (_vidCurrent === btn.dataset.del) _vidCurrent = null;
      await refreshVideos();
    };
  });
  box.querySelectorAll('.vid-cancel').forEach(btn => {
    btn.onclick = async (e) => { e.stopPropagation(); await window.onda.videos.downloadCancel(btn.dataset.cancel); delete _vidDls[btn.dataset.cancel]; renderVideoList(); };
  });
  box.querySelectorAll('.vid-del[data-vid-del]').forEach(btn => {
    btn.onclick = async (e) => { e.stopPropagation(); delete _vidDls[btn.dataset.vidDel]; renderVideoList(); };
  });
}

function playVideo(v) {
  if (!v) return;
  _vidCurrent = v.path;
  _vidResults = [];
  _vidIndex = 0;
  document.getElementById('vid-url').value = '';
  renderVideoList();
}

async function refreshVideos() {
  if (!window.onda || !window.onda.videos) return;
  try { _vidItems = await window.onda.videos.scan(); renderVideoList(); } catch (e) { console.error(e); }
}

async function handleSearch(query) {
  _vidLoading = true; _vidResults = []; _vidIndex = 0; renderVideoList();
  try { 
    if (isDriveUrl(query)) {
      _vidResults = [{ id: 'drive', title: 'Video de Drive', channel: 'Google Drive', duration: 0, thumb: '', url: query }];
    } else {
      const r = await window.onda.youtubeSearchList(query) || []; 
      _vidResults = r.slice(0, 20); 
    }
  } catch (e) { _vidResults = []; }
  _vidLoading = false; renderVideoList();
}

async function startVideoDownload(url, quality, title) {
  if (!url) return;
  try {
    const r = await window.onda.videos.download(url, quality, null);
    if (r && r.error) await window.showAlert('Error: ' + r.error);
    else if (r && r.duplicated) await window.showAlert('Ya se está descargando');
    else if (r && r.id) {
      _vidDls[r.id] = { title: title || 'Iniciando...', progress: 0, status: 'running', quality: quality === 'best' ? 'Mejor' : quality + 'p' };
      renderVideoList();
    }
  } catch (e) { 
    await window.showAlert('Error: ' + (e && e.message || e)); 
    throw e; // Lanzamos el error para que el botón se reactive
  }
}

function viewVideos(v) {
  v.innerHTML = `
    <h2 style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      <span>Videos</span>
      <span style="display:flex;gap:8px">
        <button id="vid-manage" class="dl-chip">⚙ Carpetas</button>
        <button id="vid-add" class="dl-main">+ Añadir carpeta</button>
      </span>
    </h2>
    <div class="vid-top-bar">
      <input id="vid-url" type="text" placeholder="Pega URL o busca..." spellcheck="false">
      <button id="vid-back-btn" class="dl-chip" style="display:none; white-space:nowrap;">← Volver</button>
      <select id="vid-quality"><option value="best">Mejor</option><option value="1080">1080p</option><option value="720" selected>720p</option><option value="480">480p</option></select>
      <button id="vid-dl-btn" class="dl-main">🔍 Buscar / ⬇ Descargar</button>
    </div>
    <div class="vid-main-container">
      <div class="vid-top-row">
        <div id="vid-featured" class="vid-featured"></div>
        <div id="vid-player" class="vid-player"></div>
        <div id="vid-next" class="vid-next"></div>
      </div>
      <div class="vid-stairs-container"></div>
      <div class="vid-base-panel">
        <h3 class="vid-base-title">BIBLIOTECA LOCAL Y DESCARGAS</h3>
        <div id="vid-list" class="vid-list"></div>
      </div>
    </div>
  `;

  document.getElementById('vid-add').onclick = async () => { const d = await window.onda.videos.addFolder(); if (d) await refreshVideos(); };
  document.getElementById('vid-manage').onclick = async () => { await window.showAlert('Gestiona tus carpetas desde Ajustes.'); };

  const clearSearch = () => {
    document.getElementById('vid-url').value = '';
    _vidResults = [];
    _vidIndex = 0;
    _vidLoading = false;
    renderVideoList();
  };

  document.getElementById('vid-back-btn').onclick = clearSearch;

  const doAction = () => {
    const val = document.getElementById('vid-url').value.trim();
    if (!val) { clearSearch(); return; }
    const quality = document.getElementById('vid-quality').value;
    if (isYouTubeUrl(val) || isDriveUrl(val)) {
      startVideoDownload(val, quality, 'Video');
      document.getElementById('vid-url').value = '';
    } else {
      handleSearch(val);
    }
  };
  
  document.getElementById('vid-dl-btn').onclick = doAction;
  document.getElementById('vid-url').onkeydown = (e) => { 
    if (e.key === 'Enter') doAction(); 
    if (e.key === 'Escape') clearSearch();
  };

  // Lógica de arrastre
  const playerBox = document.getElementById('vid-player');
  let isDragging = false;
  let startX = 0;
  let currentX = 0;

  playerBox.addEventListener('pointerdown', (e) => {
    // Si el clic fue en un botón, no arrastrar
    if (e.target.closest('button')) return;
    
    if (!playerBox.querySelector('.vid-search-card')) return;
    isDragging = true;
    startX = e.clientX;
    playerBox.style.transition = 'none';
    playerBox.style.cursor = 'grabbing';
    playerBox.setPointerCapture(e.pointerId);
  });

  playerBox.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    if ((currentX > 0 && _vidIndex === 0) || (currentX < 0 && _vidIndex === _vidResults.length - 1)) {
      currentX = currentX * 0.2;
    }
    playerBox.style.transform = `translateX(${currentX}px)`;
  });

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    playerBox.style.cursor = 'pointer';
    playerBox.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
    
    if (currentX < -100 && _vidIndex < _vidResults.length - 1) {
      _vidIndex++;
      renderVideoList();
    } else if (currentX > 100 && _vidIndex > 0) {
      _vidIndex--;
      renderVideoList();
    } else {
      playerBox.style.transform = `translateX(0)`;
    }
    currentX = 0;
  };

  playerBox.addEventListener('pointerup', endDrag);
  playerBox.addEventListener('pointercancel', endDrag);
  playerBox.addEventListener('pointerleave', endDrag);

  refreshVideos();
}

if (!window._vidProgressBound && window.onda && window.onda.on) {
  window._vidProgressBound = true;
  window.onda.on('video:progress', (p) => {
    if (!p) return;
    _vidDls[p.id] = { title: p.title || 'Video', progress: p.progress || 0, status: p.status || 'running', quality: p.quality || '' };
    if (typeof view !== 'undefined' && view === 'videos') renderVideoList();
    if (p.status === 'done') setTimeout(() => { delete _vidDls[p.id]; if (typeof view !== 'undefined' && view === 'videos') refreshVideos(); }, 2000);
  });
}