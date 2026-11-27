/* Iconos de línea de Onda (dorado, trazo fino).
   - window.ic(nombre, tamaño) devuelve un <svg> listo para usar en cualquier HTML.
   - Además reemplaza solo los emojis y los iconos rellenos antiguos que la app dibuje,
     para que nunca aparezca un icono de otro estilo. */
(() => {
  if (window.__ondaIcons) return;
  window.__ondaIcons = 1;

  const P = {
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    prev: '<path d="M7 5v14"/><path d="M19 5.5v13L9 12z"/>',
    next: '<path d="M17 5v14"/><path d="M5 5.5v13L15 12z"/>',
    shuffle: '<path d="M3 7h3.5c2 0 3.2 1 4.3 2.8l2.4 4.4c1.1 1.8 2.3 2.8 4.3 2.8H21"/><path d="M18 14l3 3-3 3"/><path d="M3 17h3.5c1.1 0 2-.4 2.8-1.2"/><path d="M13 8.2C14 7.4 15.1 7 16.5 7H21"/><path d="M18 4l3 3-3 3"/>',
    repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 014-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 01-4 4H4"/>',
    repeat1: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 014-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 01-4 4H4"/><path d="M11 10.5l1.5-1v5.5"/>',
    heart: '<path d="M12 20.5l-1.2-1.1C6 15.3 3 12.6 3 9.2 3 6.6 5 4.5 7.6 4.5c1.5 0 3 .7 4.4 2.2 1.4-1.5 2.9-2.2 4.4-2.2C19 4.5 21 6.6 21 9.2c0 3.4-3 6.1-7.8 10.2L12 20.5z"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eq: '<path d="M5 4v7M5 17v3M12 4v1M12 11v9M19 4v9M19 19v1"/><circle cx="5" cy="14" r="2.5"/><circle cx="12" cy="8" r="2.5"/><circle cx="19" cy="16" r="2.5"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
    lyrics: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    folder: '<path d="M3 7a2 2 0 012-2h4l2 2.5h8a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M8.5 21h7"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3z"/>',
    refresh: '<path d="M20 11a8 8 0 00-14.3-4.5L4 9M4 4v5h5M4 13a8 8 0 0014.3 4.5L20 15M20 20v-5h-5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    cancel: '<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>',
    volume: '<path d="M4 9.5v5h4l5 4.5v-14L8 9.5z"/><path d="M16.5 9a4 4 0 010 6M19 6.5a7.5 7.5 0 010 11"/>'
  };

  const ATTR = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

  function ic(name, size) {
    const p = P[name];
    if (!p) { console.warn('[icons] no existe el icono', name); return ''; }
    const s = size || '1em';
    return '<svg data-ic="' + name + '" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" ' + ATTR + '>' + p + '</svg>';
  }
  window.ic = ic;
  window.ONDA_ICONS = Object.keys(P);

  /* Emoji -> icono */
  const EMO = {
    '\u{1F3A4}': 'mic', '\u{1F5D1}': 'trash', '\u{1F4C2}': 'folder', '\u{1F50D}': 'search',
    '\u2B07': 'download', '\u2705': 'check', '\u2713': 'check', '\u26D4': 'cancel',
    '\u26A0': 'alert', '\u23EE': 'prev', '\u23ED': 'next', '\u23F8': 'pause',
    '\u25B6': 'play', '\u2715': 'close', '\u2764': 'heart', '\u{1F3B5}': 'music'
  };
  const RE = /[\u{1F3A4}\u{1F5D1}\u{1F4C2}\u{1F50D}\u2B07\u2705\u2713\u26D4\u26A0\u23EE\u23ED\u23F8\u25B6\u2715\u2764\u{1F3B5}]\uFE0F?/gu;
  const RT = /[\u{1F3A4}\u{1F5D1}\u{1F4C2}\u{1F50D}\u2B07\u2705\u2713\u26D4\u26A0\u23EE\u23ED\u23F8\u25B6\u2715\u2764\u{1F3B5}]/u;
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|OPTION|SELECT|TITLE)$/;

  /* Iconos rellenos antiguos (por el inicio de su trazo) -> icono de línea */
  const SIG = [
    ['M8 5v14l11-7z', 'play'], ['M6 5h4v14H6z', 'pause'], ['M6 6h2v12H6z', 'prev'],
    ['M6 18l8.5-6L6 6z', 'next'], ['M10.59 9.17', 'shuffle'], ['M7 7h10v3l4-4', 'repeat'],
    ['M3 9v6h4l5 5V4', 'volume'], ['M12 21.35l-1.45', 'heart'], ['M3 17.25V21h3.75', 'edit'],
    ['M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z', 'plus'], ['M3 17v2h6v-2H3z', 'eq'],
    ['M15 1H9v2h6V1z', 'timer'], ['M14 2H6c-1.1', 'lyrics'], ['M12 3v10.55', 'music'],
    ['M17 10.5V7c0-.55', 'video'], ['M5 20h14v-2H5v2z', 'download'], ['M12 14c1.66', 'mic'],
    ['M17.65 6.35A7.958', 'refresh'], ['M15.5 14h-.79', 'search']
  ];

  function sweepText(node) {
    try {
      const par = node.parentElement;
      if (!par || SKIP.test(par.tagName) || par.closest('#st')) return;
      const txt = node.nodeValue || '';
      if (!RT.test(txt)) return;
      RE.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = RE.exec(txt))) {
        if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
        const sp = document.createElement('span');
        sp.className = 'ic-i';
        sp.innerHTML = ic(EMO[m[0].replace('\uFE0F', '')], '1.1em');
        frag.appendChild(sp);
        last = RE.lastIndex;
      }
      if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
      node.parentNode.replaceChild(frag, node);
    } catch (e) { console.error('[icons] texto', e); }
  }

  function sweepSvg(root) {
    try {
      const list = [];
      if (root.nodeName && root.nodeName.toLowerCase() === 'svg') list.push(root);
      root.querySelectorAll('svg:not([data-ic])').forEach(s => list.push(s));
      list.forEach(svg => {
        if (svg.hasAttribute('data-ic') || !svg.parentNode) return;
        const path = svg.querySelector('path');
        const d = (path && path.getAttribute('d')) || '';
        let name = '';
        for (const [pre, nm] of SIG) { if (d.indexOf(pre) === 0) { name = nm; break; } }
        if (!name) return;
        if (name === 'repeat' && d.indexOf('zm-4-2V9h-1') > -1) name = 'repeat1';
        const t = document.createElement('template');
        t.innerHTML = ic(name, svg.getAttribute('width') || '1em');
        const nuevo = t.content.firstChild;
        const cls = svg.getAttribute('class'), sty = svg.getAttribute('style');
        if (cls) nuevo.setAttribute('class', cls);
        if (sty) nuevo.setAttribute('style', sty);
        svg.replaceWith(nuevo);
      });
    } catch (e) { console.error('[icons] svg', e); }
  }

  function run(n) {
    if (!n) return;
    if (n.nodeType === 3) { sweepText(n); return; }
    if (n.nodeType !== 1) return;
    sweepSvg(n);
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
    const arr = []; let x;
    while ((x = w.nextNode())) arr.push(x);
    arr.forEach(sweepText);
  }

  const pend = new Set(); let raf = 0;
  function flush() {
    raf = 0;
    pend.forEach(n => { if (n.isConnected) run(n); });
    pend.clear();
  }
  const mo = new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'characterData') pend.add(m.target);
      else m.addedNodes.forEach(n => pend.add(n));
    }
    if (!raf) raf = requestAnimationFrame(flush);
  });

  function start() {
    run(document.body);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();