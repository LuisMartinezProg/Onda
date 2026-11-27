/* Limpieza de títulos: ordena cada canción como Título / Artista y busca el género del artista (iTunes) */
(() => {
  if (window.__ondaLimpieza) return;
  window.__ondaLimpieza = 1;

  const UNK = /^(artista desconocido|desconocido|unknown( artist)?|<unknown>|various artists?|varios artistas)$/i;
  /* Ruido al final del título (sin tocar palabras que pueden ser parte del nombre, como "Letras") */
  const NS_T = 'official\\s+(?:music\\s+|lyrics?\\s+|audio\\s+|hd\\s+)?(?:video|audio|mv|clip|visuali[sz]er)|(?:video|audio)\\s+oficial|videoclip(?:\\s+oficial)?|visuali[sz]er|lyrics?\\s+video|full\\s+(?:version|song)|tv\\s*size|1080p|720p|4k|m\\/v|(?:eng|esp)\\s*sub(?:s|titles?)?|sub(?:t[ií]tulos?|titulad[oa]s?|s)?\\s+(?:en\\s+|al\\s+)?(?:espa[ñn]ol|ingl[eé]s|english|spanish)';
  /* Ruido dentro de paréntesis o corchetes */
  const NS_B = NS_T + '|lyrics?|letras?(?:\\s+en\\s+espa[ñn]ol)?|con\\s+letra|hd|hq|mv|romaji|traducid[oa]s?(?:\\s+al\\s+espa[ñn]ol)?';
  const NOISE = new RegExp('(?<![\\p{L}\\p{N}])(?:' + NS_B + ')(?![\\p{L}\\p{N}])', 'giu');
  const TAIL = new RegExp('(?:\\s*[-–—|:]\\s*|\\s+)(?:' + NS_T + ')\\s*$', 'iu');
  const DECO = /^[\s★☆♪♫♬♡❤✦✧◆◇●○■□▶◀~～\-–—|·•:]+|[\s★☆♪♫♬♡❤✦✧◆◇●○■□▶◀~～\-–—|·•:]+$/gu;

  function stripNoise(s) {
    s = s.replace(/[(\[{（【][^)\]}）】]*[)\]}）】]/g, seg => {
      const rest = seg.slice(1, -1).replace(NOISE, ' ').replace(/[\s\-–—_|\/,.+&:]+/g, ' ').trim();
      return rest ? seg : ' '; // si solo había ruido, se quita el paréntesis entero
    });
    for (let i = 0; i < 3; i++) { const n = s.replace(TAIL, ''); if (n === s) break; s = n; }
    return s;
  }
  function prep(s) {
    s = String(s == null ? '' : s);
    try { s = s.normalize('NFKC'); } catch (e) {}
    s = s.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ' ').replace(/_+/g, ' ');
    s = stripNoise(s).replace(/\s+/g, ' ').trim();
    return s.replace(DECO, '').trim();
  }
  function cleanArtist(a) {
    a = prep(a);
    return a.replace(/\s*-\s*topic$/i, '').replace(/\s*vevo$/i, '').replace(/\s*(official|oficial)(\s+channel|\s+canal)?$/i, '').replace(/\s+/g, ' ').trim();
  }

  /* Devuelve {t, a}: título y artista ordenados */
  function cleanTrack(t) {
    let title = prep(t && t.t), artist = cleanArtist(t && t.a);
    let unk = !artist || UNK.test(artist);
    const nA = ondaNorm(artist);
    let m;
    if ((m = title.match(/^(.{1,80}?)\s*[「『](.+?)[」』]/)) && m[2]) { // Artista「Título」
      const left = m[1].trim();
      if (unk && left) { artist = left; unk = false; }
      title = m[2].trim();
    } else if ((m = title.match(/^(.{1,80}?)\s+[-–—]\s+(.+)$/))) { // Artista - Título
      const L = m[1].trim(), R = m[2].trim(), nL = ondaNorm(L), nR = ondaNorm(R);
      if (unk) { artist = L; title = R; unk = false; }
      else if (nL.length > 1 && (nL === nA || nL.includes(nA) || nA.includes(nL))) title = R;
      else if (nR.length > 1 && (nR === nA || nR.includes(nA) || nA.includes(nR))) title = L;
    } else if (unk && (m = title.match(/^(.+?)\s*\|\s*(.+)$/))) { // Título | Artista
      title = m[1].trim(); artist = m[2].trim(); unk = false;
    }
    title = title.replace(/^["“'‘]+|["”'’]+$/g, '').trim();
    if (!title) title = prep(t && t.t) || String((t && t.t) || '');
    return { t: title, a: unk || !artist ? 'Artista desconocido' : artist };
  }
  window.ondaCleanTrack = cleanTrack;

  /* ---- Género por artista (iTunes), con caché ---- */
  const GK = 'onda.genreCache';
  let GC = {};
  try { GC = JSON.parse(localStorage.getItem(GK) || '{}') || {}; } catch (e) { GC = {}; }
  const saveGC = () => { try { localStorage.setItem(GK, JSON.stringify(GC)); } catch (e) {} };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function genreOf(artist) {
    const k = ondaNorm(artist);
    if (GC[k] !== undefined) return GC[k];
    const j = await onda.webJson('https://itunes.apple.com/search?term=' + encodeURIComponent(artist) + '&entity=musicArtist&limit=5');
    let g = '';
    if (j && Array.isArray(j.results)) {
      const hit = j.results.find(x => ondaNorm(x.artistName) === k); // solo coincidencia exacta
      if (hit && hit.primaryGenreName) g = window.ondaGenreEs(hit.primaryGenreName);
    }
    if (j) { GC[k] = g; saveGC(); } // solo se recuerda si el servidor respondió
    return g;
  }

  /* ---- Aviso corto ---- */
  let tz = null, tzT = 0;
  function toast(msg) {
    if (!tz) { tz = document.getElementById('onda-toast'); }
    if (!tz) { tz = document.createElement('div'); tz.id = 'onda-toast'; tz.setAttribute('role', 'status'); document.body.appendChild(tz); }
    tz.textContent = msg; tz.classList.add('on');
    clearTimeout(tzT); tzT = setTimeout(() => tz.classList.remove('on'), 3200);
  }

  function openDialog(html) {
    const old = document.getElementById('onda-clean');
    if (old) old.remove();
    const d = document.createElement('dialog');
    d.id = 'onda-clean';
    d.innerHTML = html;
    d._job = { cancel: false };
    document.body.appendChild(d);
    d.addEventListener('close', () => { d._job.cancel = true; setTimeout(() => d.remove(), 0); });
    d.showModal();
    return d;
  }

  async function genreJob(d) {
    const byA = new Map();
    lib.forEach(t => {
      if (t.g || !t.a || UNK.test(t.a)) return;
      const k = ondaNorm(t.a);
      if (!byA.has(k)) byA.set(k, { a: t.a, list: [] });
      byA.get(k).list.push(t);
    });
    const arr = [...byA.values()];
    d.innerHTML = '<h2>Buscando géneros…</h2><p id="cl-st" style="color:var(--dim);font-size:13px">0 / ' + arr.length + ' artistas</p><div class="cl-bar"><i id="cl-bar"></i></div><div class="pre" style="justify-content:center"><button class="chip" id="cl-stop">Cancelar</button></div>';
    d.querySelector('#cl-stop').onclick = () => { d._job.cancel = true; d.querySelector('#cl-stop').disabled = true; };
    let i = 0, done = 0, found = 0;
    const upd = () => {
      const st = d.querySelector('#cl-st'), br = d.querySelector('#cl-bar');
      if (st) st.textContent = done + ' / ' + arr.length + ' artistas';
      if (br) br.style.width = (arr.length ? done / arr.length * 100 : 100) + '%';
    };
    const w = async () => {
      while (i < arr.length && !d._job.cancel) {
        const it = arr[i++];
        let g = '';
        try { g = await genreOf(it.a); } catch (e) { console.error('[limpieza] género', e); }
        if (g) it.list.forEach(t => { if (!t.g) { t.g = g; found++; } });
        done++; upd();
        await sleep(350);
      }
    };
    await Promise.all([w(), w()]);
    return { found, cancelled: d._job.cancel && done < arr.length };
  }

  async function start() {
    if (!lib.length) { window.showAlert('Aún no hay canciones para limpiar.'); return; }
    const cambios = [];
    lib.forEach(t => {
      const r = cleanTrack(t), oa = t.a || 'Artista desconocido';
      if (r.t !== t.t || r.a !== oa) cambios.push({ t, r });
    });
    const sinG = lib.filter(t => !t.g && t.a && !UNK.test(t.a)).length;
    const online = !!(window.onda && onda.webJson);
    const items = cambios.slice(0, 60).map(c => '<div class="cl-it"><s>' + esc(c.t.t) + (c.t.a ? ' — ' + esc(c.t.a) : '') + '</s><br><b>' + esc(c.r.t) + ' — ' + esc(c.r.a) + '</b></div>').join('');
    const mas = cambios.length > 60 ? '<div class="cl-it" style="color:var(--dim)">…y ' + (cambios.length - 60) + ' más</div>' : '';
    const conGenero = online && sinG > 0;
    const nada = !cambios.length && !conGenero;
    const d = openDialog('<h2>Limpiar títulos</h2>'
      + (cambios.length
        ? '<p style="color:var(--dim);font-size:13px">' + cambios.length + ' de ' + lib.length + ' canciones se ordenarán como Título / Artista. Revisa los cambios:</p><div class="cl-list">' + items + mas + '</div>'
        : '<p style="color:var(--dim);font-size:13px">Tus títulos ya están ordenados como Título / Artista.</p>')
      + (conGenero ? '<label class="cl-chk"><input type="checkbox" id="cl-g" checked> Buscar también el género en línea (' + sinG + ' canciones sin género)</label>' : '')
      + '<div class="pre" style="justify-content:center">' + (nada ? '' : '<button class="chip ed-ok" id="cl-ok">Aplicar</button>') + '<button class="chip" id="cl-no">' + (nada ? 'Cerrar' : 'Cancelar') + '</button></div>');
    d.querySelector('#cl-no').onclick = () => d.close();
    const ok = d.querySelector('#cl-ok');
    if (!ok) return;
    ok.onclick = async () => {
      const buscarG = !!(d.querySelector('#cl-g') && d.querySelector('#cl-g').checked);
      if (cambios.length) {
        cambios.forEach(c => { c.t.t = c.r.t; c.t.a = c.r.a; });
        save(); render();
        if (q[ci] && cambios.some(c => c.t === q[ci])) info(q[ci]);
      }
      if (!buscarG) { d.close(); toast(cambios.length + (cambios.length === 1 ? ' canción ordenada' : ' canciones ordenadas')); return; }
      let r = { found: 0, cancelled: false };
      try { r = await genreJob(d); } catch (e) { console.error('[limpieza] buscar géneros', e); }
      save(); render();
      d.close();
      toast(cambios.length + ' ordenadas · género encontrado en ' + r.found + (r.found === 1 ? ' canción' : ' canciones') + (r.cancelled ? ' (búsqueda cancelada)' : ''));
    };
  }

  const v = document.getElementById('v');
  if (v) v.addEventListener('click', e => {
    const b = e.target.closest('[data-act="clean"]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    start().catch(err => { console.error('[limpieza]', err); window.showAlert('No se pudo limpiar los títulos.'); });
  }, true);
})();