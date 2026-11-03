/* Capa nativa: escaneo de carpetas con el disco real, detección de cambios y teclas multimedia */
(() => {
  if (!window.onda) return;
  const U = p => 'onda://app/media?p=' + encodeURIComponent(p);
  const busy = new Set();

  async function sync(dir) {
    if (busy.has(dir)) return; busy.add(dir);
    try {
      const ps = await onda.scan(PF, dir); $('#st').textContent = ps.length ? 'Encontrados ' + ps.length + ' archivos de audio…' : 'Sin audio en ' + dir.split(/[\\/]/).pop(); const  now = new Set(ps.map(U)), have = new Set(lib.filter(t => t.d === dir).map(t => t.u));
      lib = lib.filter(t => t.d !== dir || now.has(t.u));            // quita las borradas
      const add = ps.filter(p => !have.has(U(p)));                    // solo procesa las nuevas
      let i = 0, n = 0;
      const w = async () => {
        while (i < add.length) {
          const p = add[i++], u = U(p), b = p.split(/[\\/]/).pop().replace(/\.\w+$/, ''), m = b.match(/^(.+?) - (.+)$/);
          const g = (await onda.tags(PF, p)) || {};
          lib.push({ id: crypto.randomUUID(), r: -2, d: dir, u, p: [p], t: g.title || (m ? m[2] : b), a: g.artist || (m ? m[1] : 'Artista desconocido'), al: g.album || 'Álbum desconocido', n: parseInt(g.track) || 0, fav: 0 });
          $('#st').textContent = 'Escaneando ' + (++n) + '/' + add.length;
          if (n % 60 == 0) render();
        }
      };
      await Promise.all([w(), w(), w(), w()]);
      $('#st').textContent = lib.length + ' canciones' + (ps.length ? '' : ' (sin audio en ' + dir.split(/[\\/]/).pop() + ')');
      save(); render();
    } catch (e) { $('#st').textContent = 'Error: ' + (e && e.message || e); } finally { busy.delete(dir); }
  }

  $('#add').onclick = async () => { const d = await onda.add(PF); if (d) { window.FOL = await onda.folders(PF); sync(d); } };
  onda.on('changed', d => sync(d));
  onda.on('cmd', c => $('#' + c).click());
  setTimeout(async () => { window.FOL = await onda.folders(PF); for (const d of window.FOL) await sync(d); }, 400);
})();