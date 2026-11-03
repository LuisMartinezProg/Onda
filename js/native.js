/* Capa nativa: escaneo de carpetas, deteccion de cambios y teclas multimedia */
(() => {
  if (!window.onda) return;
  const U = p => 'onda://app/media?p=' + encodeURIComponent(p);
  const busy = new Set();
  const _addingUrls = new Set();
  let _isScanning = false; // Bloqueo global absoluto

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
      const add = ps.filter(p => !have.has(U(p)));
      let i = 0, n = 0;
      
      const w = async () => {
        while (i < add.length) {
          const p = add[i++], u = U(p), b = p.split(/[\\/]/).pop().replace(/\.\w+$/, ''), m = b.match(/^(.+?) - (.+)$/);
          
          // Evitar que dos hilos guarden la misma canción
          if (_addingUrls.has(u) || lib.some(x => x.u === u)) continue;
          _addingUrls.add(u);

          try {
            const g = (await onda.tags(PF, p)) || {};
            if (!lib.some(x => x.u === u)) {
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

  $('#rescan').onclick = async () => {
    const btn = document.getElementById('rescan');
    const st = document.getElementById('st');
    if(!window.FOL || !window.FOL.length){ window.showAlert('No hay carpetas añadidas todavía'); return; }
    if(btn){ btn.disabled = true; btn.classList.add('spin'); }
    const before = lib.length;
    if(st) st.textContent = 'Escaneando…';
    try {
      for (const dir of window.FOL) await sync(dir, true); 
      const added = lib.length - before;
      if(st){
        st.textContent = (added > 0 ? '✓ ' + added + (added === 1 ? ' nueva · ' : ' nuevas · ') : '') + lib.length + ' canciones';
        setTimeout(() => { if(st && st.textContent.indexOf('✓') === 0) st.textContent = lib.length + ' canciones'; }, 3000);
      }
    } catch(e){
      if(st) st.textContent = 'Error al escanear';
    }
    if(btn){ btn.disabled = false; btn.classList.remove('spin'); }
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