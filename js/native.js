/* Capa nativa: escaneo de carpetas, deteccion de cambios y teclas multimedia */
(() => {
  if (!window.onda) return;
  const U = p => 'onda://app/media?p=' + encodeURIComponent(p);
  const busy = new Set();
  const _addingUrls = new Set();
  let _isScanning = false; // Bloqueo global absoluto

  /* ---- Fase 9: minimos del escaneo (duracion y peso) y audios que no son musica ---- */
  const leeNum = (k, def, lo, hi) => { try { const v = parseInt(localStorage.getItem(k), 10); if (v >= lo && v <= hi) return v; } catch (e) {} return def; };
  const minSeg = () => leeNum('onda_min_sec', 45, 0, 600);
  const minKb = () => leeNum('onda_min_kb', 250, 0, 20480);
  const BASURA_DIR = /(^|[\\/])(whatsapp[^\\/]*|recordings?|voice\s*(notes?|recorder|memos?)|calls?|notifications?|ringtones?|alarms?|notas?\s+de\s+voz|telegram audio)([\\/]|$)/i;
  const BASURA_NOM = /^(AUD|PTT)-\d{6,}|-WA\d{3,}/i;
  const esDescargas = dir => /[\\/]Onda[\\/][\w-]+$/i.test(dir); // lo que baja Onda siempre entra
  const _excl = new Set();
  const firma = () => minSeg() + '|' + minKb() + '|';

  // Duracion de un audio leyendo solo sus datos iniciales (si no se puede leer, devuelve 0 y la cancion entra)
  const durOf = u => new Promise(res => {
    const a = new Audio();
    let fin = false, t = 0;
    const cierra = d => { if (fin) return; fin = true; clearTimeout(t); try { a.removeAttribute('src'); a.load(); } catch (e) {} res(d); };
    t = setTimeout(() => cierra(0), 4000);
    a.preload = 'metadata';
    a.onloadedmetadata = () => cierra(isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => cierra(0);
    a.src = u;
  });

  // Quita notas de voz, audios de WhatsApp y los archivos mas livianos que el minimo (solo canciones nuevas)
  async function filtrar(dir, lista) {
    if (!lista.length || esDescargas(dir)) return lista;
    const f = firma();
    let r = lista.filter(p => {
      if (_excl.has(f + p)) return false;
      const rel = p.slice(dir.length);
      const i = Math.max(rel.lastIndexOf('\\'), rel.lastIndexOf('/'));
      const malo = BASURA_DIR.test(rel.slice(0, i + 1)) || BASURA_NOM.test(rel.slice(i + 1));
      if (malo) _excl.add(f + p);
      return !malo;
    });
    const kb = minKb();
    if (kb > 0 && r.length && typeof onda.sizes === 'function') {
      const quedan = [];
      for (let i = 0; i < r.length; i += 400) {
        const trozo = r.slice(i, i + 400);
        let tam = [];
        try { tam = (await onda.sizes(PF, trozo)) || []; } catch (e) {}
        trozo.forEach((p, j) => {
          if (tam[j] >= 0 && tam[j] < kb * 1024) _excl.add(f + p); else quedan.push(p);
        });
      }
      r = quedan;
    }
    return r;
  }

  async function sync(dir, force = false) {
    if (_isScanning && !force) return; // Si ya hay un escaneo, ignorar
    if (busy.has(dir)) return; 
    
    busy.add(dir); 
    _isScanning = true;

    try {
      const ps = await onda.scan(PF, dir); 
      $('#st').textContent = ps.length ? 'Encontrados ' + ps.length + ' archivos de audio…' : 'Sin audio en ' + dir.split(/[\\/]/).pop(); 
      const now = new Set(ps.map(U)), have = new Set(lib.filter(t => t.d === dir).map(t => t.u));
      lib = lib.filter(t => t.d !== dir || now.has(t.u));
      const oc = ocultasGet(); window.__ocultasVistas = (window.__ocultasVistas || 0) + ps.filter(p => oc.has(U(p))).length;
      let add = ps.filter(p => !have.has(U(p)) && !oc.has(U(p)));
      add = await filtrar(dir, add);
      let i = 0, n = 0;
      const ms = minSeg(), descargas = esDescargas(dir), fm = firma();
      
      const w = async () => {
        while (i < add.length) {
          const p = add[i++], u = U(p), b = p.split(/[\\/]/).pop().replace(/\.\w+$/, ''), m = b.match(/^(.+?) - (.+)$/);
          
          // Evitar que dos hilos guarden la misma canción
          if (_addingUrls.has(u) || lib.some(x => x.u === u)) continue;
          _addingUrls.add(u);

          try {
            let corta = false;
            if (ms > 0 && !descargas) {
              const d = await durOf(u);
              if (d > 0 && d < ms) { corta = true; _excl.add(fm + p); }
            }
            if (!corta) {
              const g = (await onda.tags(PF, p)) || {};
              if (!lib.some(x => x.u === u)) {
                let cv = '';
                if (g.picture) {
                  try {
                    const blob = new Blob([new Uint8Array(g.picture.data)], {type: g.picture.format});
                    cv = await new Promise((resolve) => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = 300; canvas.height = 300;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, 300, 300);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                      };
                      img.onerror = () => resolve('');
                      img.src = URL.createObjectURL(blob);
                    });
                  } catch(e) {}
                }
                lib.push({ id: crypto.randomUUID(), r: -2, d: dir, u, p: [p], t: g.title || (m ? m[2] : b), a: g.artist || (m ? m[1] : 'Artista desconocido'), al: g.album || 'Álbum desconocido', n: parseInt(g.track) || 0, fav: 0, at: Date.now(), cv });
              }
            }
          } finally {
            _addingUrls.delete(u);
          }
          
          $('#st').textContent = 'Escaneando ' + (++n) + '/' + add.length;
          if (n % 60 === 0) render();
        }
      };
      await Promise.all([w(), w(), w(), w()]);
      
      $('#st').textContent = lib.length + ' canciones';
      save(); render();
    } catch (e) { 
      $('#st').textContent = 'Error: ' + (e && e.message || e); 
    } finally { 
      busy.delete(dir); 
      _isScanning = false; 
    }
  }

  $('#add').onclick = async () => { 
    const d = await onda.add(PF); 
    if (d) { 
      window.FOL = await onda.folders(PF); 
      sync(d, true); 
    } 
  };

  /* ---- Boton Reescanear: gira mientras escanea y al final dice "Escaneado" ---- */
  let _rescT = 0;
  function textoBoton(btn) {
    const tw = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT);
    let n, ultimo = null;
    while ((n = tw.nextNode())) { if (n.nodeValue.trim()) ultimo = n; }
    return ultimo;
  }
  function rescUI(estado) {
    const btn = document.getElementById('rescan');
    if (!btn) return;
    clearTimeout(_rescT);
    const n = textoBoton(btn);
    if (!n) return;
    if (n.__orig === undefined) n.__orig = n.nodeValue;
    if (estado === 'busy') n.nodeValue = ' Escaneando…';
    else if (estado === 'done') { n.nodeValue = ' ✓ Escaneado'; _rescT = setTimeout(() => rescUI('idle'), 2600); }
    else n.nodeValue = n.__orig;
  }

  $('#rescan').onclick = async () => {
    const btn = document.getElementById('rescan');
    const st = document.getElementById('st');
    if(!window.FOL || !window.FOL.length){ window.showAlert('No hay carpetas añadidas todavía'); return; }
    // Fase 9: antes de escanear, el usuario elige los minimos (duracion y peso)
    if (typeof window.ondaPedirMinimos === 'function') { const ok = await window.ondaPedirMinimos(); if (!ok) return; }
    if(btn){ btn.disabled = true; btn.classList.add('spin'); }
    rescUI('busy');
    const before = lib.length; window.__ocultasVistas = 0;
    if(st) st.textContent = 'Escaneando…';
    let fallo = false;
    try {
      for (const dir of window.FOL) await sync(dir, true);
      if (window.__ocultasVistas > 0 && await window.showConfirm('Hay ' + window.__ocultasVistas + ' canciones que quitaste de la app. ¿Volver a colocarlas?')) { localStorage.removeItem('onda.ocultas.' + PF); for (const dir of window.FOL) await sync(dir, true); }
      const added = lib.length - before;
      if(st){
        st.textContent = (added > 0 ? '✓ ' + added + (added === 1 ? ' nueva · ' : ' nuevas · ') : '') + lib.length + ' canciones';
        setTimeout(() => { if(st && st.textContent.indexOf('✓') === 0) st.textContent = lib.length + ' canciones'; }, 3000);
      }
    } catch(e){
      fallo = true;
      if(st) st.textContent = 'Error al escanear';
    }
    if(btn){ btn.disabled = false; btn.classList.remove('spin'); }
    rescUI(fallo ? 'idle' : 'done');
  };

  onda.on('changed', d => {
    if (_isScanning) return; // Ignorar absolutamente todo si estamos escaneando
    sync(d); 
  });
  
  onda.on('cmd', c => $('#' + c).click());
  
  setTimeout(async () => { 
    window.FOL = await onda.folders(PF); 
    for (const d of window.FOL) await sync(d, true); 
  }, 400);
})();