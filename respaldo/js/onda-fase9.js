/* onda-fase9.js - Onda PC, Fase 9 (Ajustes): ventana de minimos al reescanear, sin modo ahorro y seguir sonando al cambiar de audio */
(() => {
  if (window.__ondaF9) return;
  window.__ondaF9 = 1;

  /* ---- Sin modo ahorro: si alguien lo dejo activado, se apaga ---- */
  try { if (S.eco) { S.eco = 0; saveS(); theme(); if (typeof fx === 'function') fx(); } } catch (e) { console.error('[fase9] modo ahorro', e); }

  /* ---- Ventana de minimos al reescanear ---- */
  const leeNum = (k, def, lo, hi) => { try { const v = parseInt(localStorage.getItem(k), 10); if (v >= lo && v <= hi) return v; } catch (e) {} return def; };
  const SEG = [[0, 'Sin mínimo'], [10, '10 segundos'], [20, '20 segundos'], [30, '30 segundos'], [45, '45 segundos (recomendado)'], [60, '1 minuto'], [90, '1 minuto 30 s'], [120, '2 minutos']];
  const KB = [[0, 'Sin mínimo'], [100, '100 KB'], [250, '250 KB (recomendado)'], [500, '500 KB'], [1024, '1 MB'], [2048, '2 MB']];
  const opciones = (lista, cur) => {
    let o = lista.map(([v, t]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + t + '</option>').join('');
    if (!lista.some(([v]) => v === cur)) o = '<option value="' + cur + '" selected>' + cur + '</option>' + o;
    return o;
  };

  window.ondaPedirMinimos = () => new Promise(resolve => {
    const viejo = document.getElementById('onda-min-dlg');
    if (viejo) viejo.remove();
    const d = document.createElement('dialog');
    d.id = 'onda-min-dlg';
    d.innerHTML = '<h2>Reescanear música</h2>'
      + '<p style="color:var(--dim);font-size:13px;margin:8px 0 12px">Se ignoran los audios más cortos o más livianos que estos valores, las notas de voz y los archivos de WhatsApp. Las canciones que ya tienes no se tocan.</p>'
      + '<label>Duración mínima<select id="omd-sec">' + opciones(SEG, leeNum('onda_min_sec', 45, 0, 600)) + '</select></label>'
      + '<label>Peso mínimo<select id="omd-kb">' + opciones(KB, leeNum('onda_min_kb', 250, 0, 20480)) + '</select></label>'
      + '<div class="pre" style="justify-content:center;margin-top:14px"><button type="button" class="chip" id="omd-x">Cancelar</button><button type="button" class="chip ed-ok" id="omd-go">Escanear</button></div>';
    document.body.appendChild(d);
    let listo = false;
    const cierra = ok => { if (listo) return; listo = true; try { d.close(); } catch (e) {} d.remove(); resolve(ok); };
    d.querySelector('#omd-x').onclick = () => cierra(false);
    d.addEventListener('cancel', e => { e.preventDefault(); cierra(false); });
    d.querySelector('#omd-go').onclick = () => {
      try {
        localStorage.setItem('onda_min_sec', d.querySelector('#omd-sec').value);
        localStorage.setItem('onda_min_kb', d.querySelector('#omd-kb').value);
      } catch (e) {}
      cierra(true);
    };
    d.showModal();
  });

  /* ---- Seguir sonando al cambiar de dispositivo de audio (opcional) ---- */
  document.addEventListener('change', e => {
    const t = e.target;
    if (t && t.id === 'f9-keepdev') { S.keepDev = t.checked ? 1 : 0; try { saveS(); } catch (err) {} }
  });
  let tUsuario = 0, tSono = 0;
  const pausaOrig = A.pause;
  A.pause = function () { tUsuario = Date.now(); return pausaOrig.apply(this, arguments); };
  A.addEventListener('playing', () => { tSono = Date.now(); });
  A.addEventListener('timeupdate', () => { if (!A.paused) tSono = Date.now(); });

  function alCambiarDispositivo() {
    if (!S.keepDev) return;
    const t0 = Date.now();
    if (A.ended || !A.src) return;
    if (A.paused && t0 - tSono > 4000) return;   // no estaba sonando
    if (t0 - tUsuario < 1500) return;             // la acaba de pausar el usuario
    [250, 800, 1600, 2800].forEach(ms => setTimeout(() => {
      try {
        if (tUsuario > t0 || A.ended) return;
        if (typeof ctx !== 'undefined' && ctx && ctx.state !== 'running') ctx.resume();
        if (A.paused) { const p = A.play(); if (p && p.catch) p.catch(() => {}); }
      } catch (e) {}
    }, ms));
  }
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', alCambiarDispositivo);
  } catch (e) { console.error('[fase9] devicechange', e); }
})();