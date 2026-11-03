(function(){
  if (window.__ytPreviewInit) return;
  window.__ytPreviewInit = true;

  async function showInPlayer(videoId, title) {
    if (!videoId) return;
    const player = document.getElementById('vid-player');
    if (!player) return;

    player.innerHTML = '';

    // Obtener el puerto del host de loopback
    let port = 0;
    if (window.onda && window.onda.getYouTubeHost) {
      port = await window.onda.getYouTubeHost();
    }

    if (!port) {
      player.innerHTML = '<div class="kempty" style="color:var(--dim);text-align:center;padding:60px">No se pudo iniciar el host de video.</div>';
      return;
    }

    const localUrl = `http://127.0.0.1:${port}/${videoId}`;

    player.innerHTML =
      '<div class="yt-player-wrap">' +
        '<iframe src="' + localUrl + '" ' +
          'allow="autoplay; encrypted-media; picture-in-picture" ' +
          'allowfullscreen ' +
          'referrerpolicy="strict-origin-when-cross-origin" ' +
          'style="width:100%;height:100%;border:0;background:#000">' +
        '</iframe>' +
        '<div class="yt-preview-actions">' +
          '<button class="yt-preview-open-yt" data-vid="' + videoId + '" title="Abrir en YouTube">▶ YT</button>' +
          '<button class="yt-preview-dl" data-vid="' + videoId + '" data-title="' + (title || '').replace(/"/g, '&quot;') + '">⬇ Descargar</button>' +
          '<button class="yt-player-close" title="Cerrar (ESC)">✕</button>' +
        '</div>' +
      '</div>';

    // Botones
    const openBtn = player.querySelector('.yt-preview-open-yt');
    if (openBtn) openBtn.onclick = () => {
      if (window.onda && window.onda.openExternal) window.onda.openExternal('https://www.youtube.com/watch?v=' + openBtn.dataset.vid);
      else window.open('https://www.youtube.com/watch?v=' + openBtn.dataset.vid, '_blank');
    };

    const dlBtn = player.querySelector('.yt-preview-dl');
    if (dlBtn) dlBtn.onclick = () => {
      const quality = (document.getElementById('vid-quality') || {}).value || '720';
      if (typeof startVideoDownload === 'function') {
        startVideoDownload('https://www.youtube.com/watch?v=' + dlBtn.dataset.vid, quality, dlBtn.dataset.title);
        dlBtn.textContent = '✓ En cola';
        dlBtn.disabled = true;
      }
    };

    const closeBtn = player.querySelector('.yt-player-close');
    if (closeBtn) closeBtn.onclick = () => closePreview();

    document.querySelectorAll('.vid-row').forEach(r => r.classList.remove('on'));
    document.querySelectorAll('.vid-card').forEach(c => {
      if (c.dataset.vid === videoId) c.classList.add('playing');
      else c.classList.remove('playing');
    });

    window._ytPreviewActive = videoId;
  }

  function closePreview() {
    const player = document.getElementById('vid-player');
    if (!player) return;
    if (!window._ytPreviewActive) return;

    player.innerHTML =
      '<div class="vid-empty">' +
        '<svg viewBox="0 0 24 24" width="4em" height="4em" fill="var(--dim)">' +
          '<path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>' +
        '</svg>' +
        '<p style="margin:0">Selecciona un video para reproducir</p>' +
      '</div>';

    document.querySelectorAll('.vid-card').forEach(c => c.classList.remove('playing'));
    window._ytPreviewActive = null;
  }

  window.showYouTubePreview = showInPlayer;
  window.closeYouTubePreview = closePreview;

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && window._ytPreviewActive) {
      e.preventDefault();
      closePreview();
    }
  });
})();