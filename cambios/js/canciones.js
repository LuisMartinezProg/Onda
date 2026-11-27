/* Canciones: menú de tres puntos, orden, ubicar canción, selección múltiple y borrado en lote.
   Todo lo que se dibuja (filas, botones) vive en lists.js y view-list.js; aquí está el comportamiento. */
(() => {
  if (window.__ondaCanciones) return;
  window.__ondaCanciones = 1;

  const SEL = window.__ondaSel;
  const LISTA = /^(songs|favs|queue)$/;
  const sv = (n, s) => window.ondaSv(n, s);
  const $v = () => document.getElementById('v');

  /* ---- Aviso corto ---- */
  let tz = null, tzT = 0;
  function toast(msg) {
    if (!tz) { tz = document.createElement('div'); tz.id = 'onda-toast'; tz.setAttribute('role', 'status'); document.body.appendChild(tz); }
    tz.textContent = msg;
    tz.classList.add('on');
    clearTimeout(tzT);
    tzT = setTimeout(() => tz.classList.remove('on'), 2400);
  }

  /* ---- Menú flotante (uno solo a la vez) ---- */
  let menu = null, justClosed = null;
  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  function openMenu(anchor, html, pick) {
    if (justClosed === anchor) return; // el mismo botón cierra el menú que abrió
    closeMenu();
    const m = document.createElement('div');
    m.id = 'onda-menu';
    m.setAttribute('role', 'menu');
    m.innerHTML = html;
    m._a = anchor;
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
    const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    m.style.left = left + 'px';
    m.style.top = top + 'px';
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-do]');
      if (!b) return;
      const k = b.dataset.do;
      closeMenu();
      try { pick(k); } catch (err) { console.error('[canciones] acción del menú', err); toast('No se pudo completar la acción'); }
    });
    menu = m;
  }
  document.addEventListener('click', e => {
    if (menu && !menu.contains(e.target)) {
      justClosed = menu._a;
      closeMenu();
      setTimeout(() => { justClosed = null; }, 0);
    }
  }, true);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (menu) { closeMenu(); e.stopPropagation(); return; }
    if (SEL.on && !document.querySelector('dialog[open]')) setSel(false);
  }, true);
  window.addEventListener('resize', closeMenu);
  // Al abrir cualquier ventana se cierra el menú flotante
  const _show = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function () { closeMenu(); return _show.apply(this, arguments); };

  /* ---- Acciones sobre canciones ---- */
  function playTrack(t) {
    playerHidden = false;
    q = view == 'queue' ? q : cur.slice();
    const i = q.indexOf(t);
    if (i >= 0) playAt(i, true);
  }
  function addNext(items) {
    items = items.filter((t, i) => !(i === 0 && ci >= 0 && q[ci + 1] === t));
    if (!items.length) return;
    if (ci < 0 || !q[ci]) q.push(...items); else q.splice(ci + 1, 0, ...items);
    ibar();
    if (view === 'queue') render();
  }
  function openInfo(t) {
    const art = t.a && !/desconocid|unknown/i.test(t.a) ? ' ' + t.a : '';
    const url = 'https://www.google.com/search?q=' + encodeURIComponent(t.t + art);
    if (window.onda && onda.openExternal) onda.openExternal(url); else window.open(url, '_blank');
  }
  function openDelete(t) {
    const dlg = document.getElementById('deld');
    if (!dlg) return;
    _delSong = t;
    const nm = document.getElementById('deld-name'), h = document.getElementById('deld-h');
    if (nm) nm.textContent = (t.t || '') + (t.a ? ' — ' + t.a : '');
    if (h) h.textContent = 'Borrar canción';
    dlg.showModal();
  }
  function relabel() {
    const a = document.getElementById('deld-lib'), b = document.getElementById('deld-disk');
    if (a) a.textContent = 'Solo de la app';
    if (b) b.textContent = 'Del equipo (Papelera)';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', relabel); else relabel();

  function trackMenu(t, anchor) {
    const item = (k, ic, txt, cls) => '<button role="menuitem" data-do="' + k + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + sv(ic, '18px') + '<span class="t"><b>' + txt + '</b></span></button>';
    openMenu(anchor,
      item('play', 'play', 'Reproducir') + item('next', 'plus', 'Añadir a la cola') +
      item('fav', 'heart', t.fav ? 'Quitar de favoritas' : 'Añadir a favoritas') +
      item('edit', 'edit', 'Editar') + item('info', 'info', 'Buscar información') +
      '<hr>' + item('del', 'trash', 'Borrar…', 'danger'),
      k => {
        if (k === 'play') playTrack(t);
        else if (k === 'next') { addNext([t]); toast('Añadida a la cola'); }
        else if (k === 'fav') {
          t.fav = t.fav ? 0 : 1; save(); ibar();
          const b = document.querySelector('#v [data-f="' + cur.indexOf(t) + '"]');
          if (b) b.classList.toggle('on', !!t.fav);
        }
        else if (k === 'edit') openEd(t);
        else if (k === 'info') openInfo(t);
        else if (k === 'del') openDelete(t);
      });
  }

  /* ---- Orden ---- */
  function sortMenu(anchor) {
    const o = ordKnown(srch.o);
    openMenu(anchor, '<div class="mh">Ordenar por</div>' + ORD.map(x =>
      '<button role="menuitemradio" aria-checked="' + (x[0] === o) + '" data-do="' + x[0] + '"' + (x[0] === o ? ' class="sel"' : '') + '>' +
      sv(x[0], '18px') + '<span class="t"><b>' + x[1] + '</b><small>' + x[2] + '</small></span>' + (x[0] === o ? sv('check', '16px') : '') + '</button>').join(''),
      k => setOrder(k));
  }
  async function ensureSizes() {
    // El tamaño se lee del propio servidor de medios de Onda (sin tocar main.js)
    const miss = lib.filter(t => !(t.sz > 0) && t.u);
    if (!miss.length) return;
    toast('Calculando tamaños…');
    let i = 0;
    const w = async () => {
      while (i < miss.length) {
        const t = miss[i++];
        try {
          const r = await fetch(t.u, { headers: { Range: 'bytes=0-0' } });
          const cr = r.headers.get('Content-Range'), m = cr && /\/(\d+)$/.exec(cr);
          if (m) t.sz = +m[1]; else { const cl = +r.headers.get('Content-Length'); if (cl > 1) t.sz = cl; }
          try { if (r.body) await r.body.cancel(); } catch (e) {}
        } catch (e) { /* esa canción queda sin tamaño */ }
      }
    };
    await Promise.all([w(), w(), w(), w()]);
    save();
  }
  async function setOrder(k) {
    srch.o = k;
    try { localStorage.setItem('onda.sort.' + PF, k); } catch (e) {}
    if (k === 'random') window.__ondaSeed = Math.floor(Math.random() * 2147483647);
    if (k === 'size') await ensureSizes();
    render();
  }

  /* ---- Ubicar canción ---- */
  function locate() {
    const t = q[ci];
    if (!t) { toast('No hay nada sonando'); return; }
    const i = cur.indexOf(t);
    if (i < 0) { toast('La canción que suena no está en esta lista'); return; }
    const r = document.querySelector('#v .row[data-i="' + i + '"]');
    if (!r) return;
    r.scrollIntoView({ block: 'center', behavior: 'smooth' });
    r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash');
  }
  function syncLoc() {
    const b = document.getElementById('onda-loc');
    if (b) b.hidden = !(ci >= 0 && q[ci]);
  }

  /* ---- Selección múltiple ---- */
  const selVisible = () => cur.filter(t => SEL.set.has(t));
  function rowsSel() {
    document.querySelectorAll('#v .row').forEach(r => r.classList.toggle('sel', SEL.on && SEL.set.has(cur[r.dataset.i])));
  }
  function bar() {
    let b = document.getElementById('onda-bulk');
    if (b) return b;
    const col = document.querySelector('.lcol');
    if (!col) return null;
    b = document.createElement('div');
    b.id = 'onda-bulk';
    b.hidden = true;
    b.innerHTML = '<span class="bc"></span>'
      + '<button data-b="all">' + sv('select', '16px') + '<span>Seleccionar todo</span></button>'
      + '<button data-b="next" title="Añadir a la cola">' + sv('plus', '16px') + '<span>Cola</span></button>'
      + '<button data-b="fav" title="Favorita">' + sv('heart', '16px') + '<span>Favorita</span></button>'
      + '<button data-b="del" title="Borrar">' + sv('trash', '16px') + '<span>Borrar</span></button>'
      + '<button data-b="x" title="Salir de la selección" aria-label="Salir de la selección">' + sv('close', '16px') + '</button>';
    col.appendChild(b);
    b.addEventListener('click', onBulk);
    return b;
  }
  function updateBulk() {
    const b = bar();
    if (!b) return;
    b.hidden = !(SEL.on && LISTA.test(view));
    const n = selVisible().length, all = cur.length > 0 && n === cur.length;
    b.querySelector('.bc').textContent = n + (n === 1 ? ' seleccionada' : ' seleccionadas');
    b.querySelector('[data-b="all"] span').textContent = all ? 'Quitar selección' : 'Seleccionar todo';
    ['next', 'fav', 'del'].forEach(k => { b.querySelector('[data-b="' + k + '"]').disabled = !n; });
  }
  function setSel(on) {
    SEL.on = !!on;
    if (!SEL.on) SEL.set.clear();
    document.body.classList.toggle('sel-on', SEL.on);
    const bt = document.querySelector('#v [data-act="sel"]');
    if (bt) bt.classList.toggle('on', SEL.on);
    closeMenu();
    rowsSel();
    updateBulk();
  }

  function askBulkDelete(n) {
    return new Promise(res => {
      const old = document.getElementById('onda-bdel');
      if (old) old.remove();
      const d = document.createElement('dialog');
      d.id = 'onda-bdel';
      d.innerHTML = '<h2>Borrar ' + n + (n === 1 ? ' canción' : ' canciones') + '</h2><p style="color:var(--dim);font-size:13px;margin:8px 0 16px">Elige qué quieres hacer.</p>'
        + '<div class="pre" style="justify-content:center"><button class="chip" data-r="lib">Solo de la app</button><button class="chip" data-r="disk">Del equipo (Papelera)</button><button class="chip" data-r="no">Cancelar</button></div>';
      document.body.appendChild(d);
      let hecho = false;
      const fin = r => { if (hecho) return; hecho = true; try { d.close(); } catch (e) {} d.remove(); res(r); };
      d.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) fin(b.dataset.r); });
      d.addEventListener('cancel', () => fin('no'));
      d.showModal();
    });
  }
  async function bulkDelete(items) {
    if (!items.length) return;
    const r = await askBulkDelete(items.length);
    if (r === 'no') return;
    const rm = new Set();
    let fallos = 0;
    for (const t of items) {
      if (r === 'disk') {
        try {
          const p = await songPath(t);
          const res = (p && window.onda && onda.fileDelete) ? await onda.fileDelete(PF, p) : null;
          if (!res || !res.ok) { fallos++; continue; }
        } catch (e) { console.error('[canciones] borrar del equipo', e); fallos++; continue; }
      }
      if (r === 'lib') ocultarCancion(t); rm.add(t);
    }
    const sonaba = q[ci];
    lib = lib.filter(t => !rm.has(t));
    q = q.filter(t => !rm.has(t));
    if (sonaba && rm.has(sonaba)) { A.pause(); A.src = ''; ci = -1; } else { ci = q.indexOf(sonaba); }
    save();
    setSel(false);
    render();
    ibar();
    const st = document.getElementById('st');
    if (st) st.textContent = lib.length ? lib.length + ' canciones' : 'Sin música';
    toast(fallos ? (rm.size + ' borradas · ' + fallos + ' no se pudieron borrar') : (rm.size + (rm.size === 1 ? ' borrada' : ' borradas')));
  }

  function onBulk(e) {
    const b = e.target.closest('[data-b]');
    if (!b || b.disabled) return;
    const k = b.dataset.b, items = selVisible();
    if (k === 'x') setSel(false);
    else if (k === 'all') {
      if (cur.length && items.length === cur.length) SEL.set.clear(); else cur.forEach(t => SEL.set.add(t));
      rowsSel(); updateBulk();
    }
    else if (k === 'next') { addNext(items); toast(items.length + (items.length === 1 ? ' añadida a la cola' : ' añadidas a la cola')); setSel(false); }
    else if (k === 'fav') {
      const todas = items.every(t => t.fav);
      items.forEach(t => { t.fav = todas ? 0 : 1; });
      save(); render(); ibar();
      toast(todas ? 'Quitadas de favoritas' : 'Añadidas a favoritas');
    }
    else if (k === 'del') bulkDelete(items);
  }

  /* ---- Después de cada render() ---- */
  window.ondaAfterRender = () => {
    closeMenu();
    if (SEL.on && !LISTA.test(view)) { setSel(false); return; }
    syncLoc();
    updateBulk();
  };

  /* ---- Clics en la lista ---- */
  function init() {
    const v = $v();
    if (!v) return;
    v.addEventListener('click', e => {
      const t = e.target;
      const act = t.closest('[data-act]');
      if (act) {
        e.preventDefault(); e.stopPropagation();
        const k = act.dataset.act;
        if (k === 'loc') locate(); else if (k === 'sel') setSel(!SEL.on); else if (k === 'ord') sortMenu(act);
        return;
      }
      const mb = t.closest('[data-m]');
      if (mb) {
        e.preventDefault(); e.stopPropagation();
        const tr = cur[mb.dataset.m];
        if (tr) trackMenu(tr, mb);
        return;
      }
      if (SEL.on) {
        const r = t.closest('.row');
        if (r && !t.closest('[data-f]')) {
          e.preventDefault(); e.stopPropagation();
          const tr = cur[r.dataset.i];
          if (!tr) return;
          if (SEL.set.has(tr)) SEL.set.delete(tr); else SEL.set.add(tr);
          r.classList.toggle('sel', SEL.set.has(tr));
          updateBulk();
        }
      }
    }, true);
    v.addEventListener('contextmenu', e => {
      const r = e.target.closest('.row');
      if (!r) return;
      e.preventDefault();
      if (SEL.on) return;
      const tr = cur[r.dataset.i];
      justClosed = null;
      if (tr) trackMenu(tr, r.querySelector('[data-m]') || r);
    });
    v.addEventListener('scroll', closeMenu, { passive: true });
    A.addEventListener('play', syncLoc);
    A.addEventListener('emptied', syncLoc);
  }
  init();
})();