/* Karaoke: pantalla. Sin sonar = rejilla de portadas; sonando = portada grande en cascada + letra. */
const K3 = { o: 'az', busq: '', buscar: false, foco: 0, n: 120 };
const k3Sonando = () => ci >= 0 && !!q[ci] && !!A.src;
const k3Hue = t => { let h = 0; const s = String(t.id || t.t); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 360; };
function k3Lista() {
  const b = ondaNorm(K3.busq);
  const l = b ? lib.filter(t => ondaNorm(t.t + ' ' + t.a + ' ' + t.al).includes(b)) : lib;
  return ondaSort(l, K3.o);
}
const k3Cv = t => t.cv ? ' style="background-image:url(\'' + esc(t.cv) + '\')"' : '';
const k3Ph = t => t.cv ? '' : esc((t.t[0] || '♪').toUpperCase());
const K3I = {
  pv: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
  nx: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M6 18l8.5-6L6 6zm9-12v12h2V6z"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'
};

function viewKaraoke(v) {
  _karaActive = true;
  v.innerHTML = '<div id="k3" class="k3" data-modo="' + KR.modo + '">'
    + '<div class="k3-hero"><div class="k3-notes" aria-hidden="true"><i>♪</i><i>♫</i><i>♬</i><i>♪</i><i>♫</i></div><h1>Karaoke</h1><p>Elige una canción y canta</p></div>'
    + '<div class="k3-slot" id="k3-slot-g"></div>'
    + '<div class="k3-grid" id="k3-grid"></div>'
    + '<div class="k3-stage"><div class="k3-casc" id="k3-casc"></div>'
    + '<div class="k3-info"><b id="k3-ti"></b><span id="k3-ar"></span></div>'
    + '<div class="k3-ctl"><button data-k3="pv" aria-label="Anterior" title="Anterior">' + K3I.pv + '</button><button data-k3="pp" id="k3-pp" class="big" aria-label="Reproducir o pausar" title="Reproducir o pausar">' + K3I.play + '</button><button data-k3="nx" aria-label="Siguiente" title="Siguiente">' + K3I.nx + '</button><button class="btn-modo" aria-label="Modo"></button></div>'
    + '<div class="k3-slot" id="k3-slot-s"></div></div>'
    + '<div class="k3-lyr"><div class="k3-tg" id="k3-tg"></div><div class="k3-ls" id="k3-ls"></div></div></div>';
  const top = document.createElement('div'); top.id = 'k3-top'; top.className = 'k3-top';
  document.getElementById('k3-slot-g').appendChild(top);
  k3Top(); kPintarLetra();
  K3.n = 120;
  kSync();
  kCambio();
}

/* Botones circulares: buscador y aleatorio (+ orden) */
function k3Top() {
  const t = document.getElementById('k3-top'); if (!t) return;
  if (K3.buscar) {
    t.innerHTML = '<div class="k3-sbox"><input id="k3-q" type="search" autocomplete="off" placeholder="Buscar canción, artista o álbum" aria-label="Buscar" value="' + esc(K3.busq) + '"><button data-k3="sx" aria-label="Cerrar búsqueda" title="Cerrar búsqueda">' + ondaSv('close', '1em') + '</button></div>';
    const i = t.querySelector('#k3-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length);
  } else {
    t.innerHTML = '<button class="k3-circ" data-k3="buscar" aria-label="Buscar" title="Buscar">' + K3I.search + '</button>'
      + '<button class="k3-circ" data-k3="rand" aria-label="Canción al azar" title="Canción al azar">' + ondaSv('random', '1em') + '</button>'
      + '<button class="k3-ord" data-k3="ord" aria-label="Ordenar" title="Ordenar: ' + (ORD.find(x => x[0] === K3.o) || ORD[0])[1] + '">' + ondaSv(K3.o, '1em') + '</button>';
  }
}

/* Rejilla (sin sonar) */
function k3Grid() {
  const g = document.getElementById('k3-grid'); if (!g) return;
  const l = k3Lista(), top = g.scrollTop;
  if (!l.length) { g.innerHTML = '<p class="k3-vacio">' + (lib.length ? 'No hay canciones que coincidan.' : 'Aún no hay canciones. Añade una carpeta.') + '</p>'; return; }
  g.innerHTML = l.slice(0, K3.n).map((t, i) => '<button class="k3-card" data-i="' + i + '" style="--c:' + k3Hue(t) + '" title="' + esc(t.t) + '"><span class="k3-cv"' + k3Cv(t) + '>' + k3Ph(t) + '</span><b>' + esc(t.t) + '</b><small>' + esc(t.a) + '</small></button>').join('');
  g.scrollTop = top;
}

/* Cascada (sonando): portada grande al centro, las demás asoman detrás */
function k3Casc() {
  const box = document.getElementById('k3-casc'); if (!box) return;
  const l = k3Lista();
  if (!l.length) { box.innerHTML = '<p class="k3-vacio">No hay canciones que coincidan.</p>'; return; }
  const cur = l.indexOf(q[ci]);
  if (cur >= 0) K3.foco = cur;
  K3.foco = Math.max(0, Math.min(K3.foco, l.length - 1));
  const vis = new Map();
  for (let i = K3.foco - 3; i <= K3.foco + 3; i++) if (l[i]) vis.set(String(l[i].id || i), i);
  [...box.children].forEach(el => { if (!vis.has(el.dataset.k)) el.remove(); });
  vis.forEach((i, k) => {
    let el = [...box.children].find(x => x.dataset.k === k);
    if (!el) { el = document.createElement('button'); el.className = 'k3-c'; el.dataset.k = k; el.innerHTML = '<span class="k3-cv"' + k3Cv(l[i]) + '>' + k3Ph(l[i]) + '</span>'; el.title = l[i].t; box.appendChild(el); }
    const o = i - K3.foco, a = Math.abs(o);
    el.dataset.i = i;
    el.classList.toggle('mid', o === 0);
    el.style.cssText = '--x:' + (o * 56) + '%;--s:' + (1 - a * 0.14) + ';--z:' + (10 - a) + ';--op:' + (1 - a * 0.2);
  });
}

/* Estado general: rejilla o cascada, iconos, título */
function kSync() {
  const r = document.getElementById('k3'); if (!r) return;
  const son = k3Sonando();
  const was = r.classList.contains('k3-play');
  r.classList.toggle('k3-play', son);
  const top = document.getElementById('k3-top');
  const slot = document.getElementById(son ? 'k3-slot-s' : 'k3-slot-g');
  if (top && slot && top.parentElement !== slot) slot.appendChild(top);
  const pp = document.getElementById('k3-pp'); if (pp) pp.innerHTML = A.paused ? K3I.play : K3I.pause;
  const t = son ? q[ci] : null;
  const ti = document.getElementById('k3-ti'), ar = document.getElementById('k3-ar');
  if (ti) ti.textContent = t ? t.t : ''; if (ar) ar.textContent = t ? t.a + ' — ' + t.al : '';
  if (son) k3Casc(); else if (was || !document.getElementById('k3-grid').children.length) k3Grid();
  if (typeof pintarBotonModo === 'function') pintarBotonModo();
}
['play', 'pause', 'emptied', 'loadedmetadata'].forEach(ev => A.addEventListener(ev, () => { if (view === 'karaoke') kSync(); }));

/* Reproducir desde la rejilla o la cascada: la elegida suena, el aleatorio no interviene */
function k3Tocar(i) {
  const l = k3Lista(), t = l[i]; if (!t) return;
  if (t === q[ci] && A.src) { K3.foco = i; tog(); return; }
  playerHidden = false; q = l.slice(); K3.foco = i; playAt(i, true);
}
function k3Menu(btn) {
  const old = document.getElementById('k3-menu'); if (old) { old.remove(); return; }
  const m = document.createElement('div'); m.id = 'k3-menu';
  m.innerHTML = ORD.map(x => '<button data-o="' + x[0] + '" class="' + (x[0] === K3.o ? 'on' : '') + '">' + ondaSv(x[0], '16px') + '<span>' + x[1] + '</span></button>').join('');
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
  m.style.top = Math.min(r.bottom + 6, innerHeight - m.offsetHeight - 8) + 'px';
  m.onclick = e => {
    const b = e.target.closest('[data-o]'); if (!b) return;
    K3.o = b.dataset.o; if (K3.o === 'random') window.__ondaSeed = Math.floor(Math.random() * 2147483647);
    m.remove(); k3Top(); K3.n = 120; if (k3Sonando()) k3Casc(); else k3Grid();
  };
}
document.addEventListener('click', e => { const m = document.getElementById('k3-menu'); if (m && !m.contains(e.target) && !e.target.closest('[data-k3="ord"]')) m.remove(); });

document.addEventListener('click', e => {
  if (view !== 'karaoke') return;
  const root = document.getElementById('k3'); if (!root || !root.contains(e.target)) return;
  const card = e.target.closest('.k3-card, .k3-c');
  if (card) { k3Tocar(+card.dataset.i); return; }
  const ln = e.target.closest('.k3-ln');
  if (ln) { if (KR.synced && isFinite(A.duration)) A.currentTime = parseFloat(ln.dataset.t); return; }
  const b = e.target.closest('[data-k3]'); if (!b) return;
  const k = b.dataset.k3;
  if (k === 'buscar') { K3.buscar = true; k3Top(); }
  else if (k === 'sx') { K3.buscar = false; K3.busq = ''; K3.n = 120; k3Top(); if (k3Sonando()) k3Casc(); else k3Grid(); }
  else if (k === 'rand') {
    if (!lib.length) return;
    let i = Math.floor(Math.random() * lib.length);
    if (lib.length > 1 && lib[i] === q[ci]) i = (i + 1) % lib.length;
    playerHidden = false; q = lib.slice(); playAt(i, true);
  }
  else if (k === 'ord') k3Menu(b);
  else if (k === 'pv') prev();
  else if (k === 'nx') next(0);
  else if (k === 'pp') { if (A.src) tog(); else if (q.length) playAt(Math.max(ci, 0), false); }
  else if (k === 'tg') { KR.modo = b.dataset.m; KR.manual = true; kPintarLetra(); kPrep(KR.tok); }
  else if (k === 'cancelbus') { KR.tok++; KR.estado = 'no'; KR.nd = true; kPintarLetra(); }
  else if (k === 'nd') { if (KR.t) { KR.nd = true; kNoDetectada(KR.t); } }
});
document.addEventListener('input', e => {
  if (e.target.id !== 'k3-q') return;
  K3.busq = e.target.value; K3.n = 120;
  if (k3Sonando()) k3Casc(); else k3Grid();
});
document.addEventListener('wheel', e => {
  if (view !== 'karaoke' || !e.target.closest('#k3-casc')) return;
  e.preventDefault();
  const l = k3Lista(); K3.foco = Math.max(0, Math.min(l.length - 1, K3.foco + (e.deltaY > 0 ? 1 : -1))); k3Casc();
}, { passive: false });
document.addEventListener('scroll', e => {
  const g = e.target; if (!g || g.id !== 'k3-grid') return;
  if (g.scrollTop + g.clientHeight > g.scrollHeight - 500 && K3.n < k3Lista().length) { K3.n += 120; k3Grid(); }
}, true);