/* Ayudas para listas: iconos de línea, orden de 7 opciones, fila de canción, marca de la que suena, agrupar */
window.__ondaSel = window.__ondaSel || { on: false, set: new Set() };
window.__ondaSeed = window.__ondaSeed || Math.floor(Math.random() * 2147483647);

/* ---- Iconos de línea (mismo estilo que icons.js) ---- */
const _SVP = {
  wand: '<path d="M5 19L17 7"/><path d="M15 5l4 4"/><path d="M19 2v3M17.5 3.5h3M6 3v2M5 4h2M20 14v2M19 15h2"/>',
  more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  select: '<path d="M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11 6h9M11 12h9M11 18h9"/>',
  az: '<path d="M4 6h10M4 12h7M4 18h4"/><path d="M18 5v14M15 16l3 3 3-3"/>',
  za: '<path d="M4 6h4M4 12h7M4 18h10"/><path d="M18 19V5M15 8l3-3 3 3"/>',
  recent: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  old: '<path d="M7 4h10M7 20h10"/><path d="M8 4c0 4 4 5 4 8s-4 4-4 8M16 4c0 4-4 5-4 8s4 4 4 8"/>',
  artist: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
  size: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  random: '<path d="M3 7h3.5c2 0 3.2 1 4.3 2.8l2.4 4.4c1.1 1.8 2.3 2.8 4.3 2.8H21"/><path d="M18 14l3 3-3 3"/><path d="M3 17h3.5c1.1 0 2-.4 2.8-1.2"/><path d="M13 8.2C14 7.4 15.1 7 16.5 7H21"/><path d="M18 4l3 3-3 3"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  heart: '<path d="M12 20.5l-1.2-1.1C6 15.3 3 12.6 3 9.2 3 6.6 5 4.5 7.6 4.5c1.5 0 3 .7 4.4 2.2 1.4-1.5 2.9-2.2 4.4-2.2C19 4.5 21 6.6 21 9.2c0 3.4-3 6.1-7.8 10.2L12 20.5z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>'
};
window.ondaSv = function (n, s) {
  const p = _SVP[n];
  if (!p) return '';
  const z = s || '1em';
  return '<svg data-ic="' + n + '" viewBox="0 0 24 24" width="' + z + '" height="' + z + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
};

/* ---- Orden (7 opciones) ---- */
const ORD = [
  ['az', 'A-Z', 'Por título, de la A a la Z'],
  ['za', 'Z-A', 'Por título, de la Z a la A'],
  ['recent', 'Reciente', 'Las agregadas más nuevas primero'],
  ['old', 'No reciente', 'Las más antiguas primero'],
  ['artist', 'Artista', 'Por nombre de artista'],
  ['size', 'Tamaño', 'Las más pesadas primero'],
  ['random', 'Aleatorio', 'Una mezcla distinta cada vez']
];
const ORD_OLD = { t: 'az', a: 'artist', al: 'az', at: 'recent' }; // valores de versiones anteriores
function ordKnown(o) { if (ORD_OLD[o]) return ORD_OLD[o]; return ORD.some(x => x[0] === o) ? o : 'az'; }
try { srch.o = ordKnown(localStorage.getItem('onda.sort.' + PF) || srch.o); } catch (e) { srch.o = 'az'; }

function ondaNorm(s) {
  s = String(s == null ? '' : s).trim();
  try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
  return s.toLowerCase();
}
const _RL = (() => { try { return new RegExp('\\p{L}', 'u'); } catch (e) { return null; } })();
/* 0 = números, 1 = símbolos, 2 = letras (incluye kana y kanji), 3 = vacío */
function _cls(s) {
  const c = s.charAt(0);
  if (!c) return 3;
  if (c >= '0' && c <= '9') return 0;
  if (_RL ? _RL.test(c) : c.toLowerCase() !== c.toUpperCase()) return 2;
  return 1;
}
function _cmpText(a, b, rev) {
  const A = ondaNorm(a), B = ondaNorm(b), ca = _cls(A), cb = _cls(B);
  if (ca !== cb) return ca - cb;
  let r;
  try { r = A.localeCompare(B, 'es', { numeric: true, sensitivity: 'base' }); } catch (e) { r = A < B ? -1 : (A > B ? 1 : 0); }
  return rev ? -r : r;
}
function _hash(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
function _tid(t) { return String(t.id || t.u || t.t); }
function ondaSort(list, o) {
  const c = list.slice();
  o = ordKnown(o);
  if (o === 'az') c.sort((a, b) => _cmpText(a.t, b.t, false) || _cmpText(a.a, b.a, false));
  else if (o === 'za') c.sort((a, b) => _cmpText(a.t, b.t, true) || _cmpText(a.a, b.a, false));
  else if (o === 'recent') c.sort((a, b) => ((b.at || 0) - (a.at || 0)) || _cmpText(a.t, b.t, false));
  else if (o === 'old') c.sort((a, b) => ((a.at || 0) - (b.at || 0)) || _cmpText(a.t, b.t, false));
  else if (o === 'artist') c.sort((a, b) => _cmpText(a.a, b.a, false) || _cmpText(a.t, b.t, false));
  else if (o === 'size') c.sort((a, b) => ((b.sz || 0) - (a.sz || 0)) || _cmpText(a.t, b.t, false));
  else if (o === 'random') { const sd = String(window.__ondaSeed); c.sort((a, b) => _hash(_tid(a) + ':' + sd) - _hash(_tid(b) + ':' + sd)); }
  return c;
}

/* ---- Lista ---- */
const key = { t: 't', a: 'a', al: 'al' };
function row(t, i) {
  const p = q[ci] === t;
  const nu = (t.at || 0) > Date.now() - 30 * 60 * 1000; // "Nuevo": máximo 30 minutos
  const s = window.__ondaSel, on = s.on && s.set.has(t);
  return `<div class="row${p ? ' pl' : ''}${on ? ' sel' : ''}" data-i="${i}"><span class="chk" aria-hidden="true">${ondaSv('check', '18px')}</span><div class="th"${t.cv ? ` style="background:center/cover url('${t.cv}')"` : ''}>${t.cv ? '' : esc(t.t[0] || '♪').toUpperCase()}</div><b>${esc(t.t)}${nu ? '<i class="onda-new">Nuevo</i>' : ''}</b><span class="al">${esc(t.a)} · ${esc(t.al)}</span><button class="fv${t.fav ? ' on' : ''}" data-f="${i}" aria-label="Favorita" title="Favorita">${ondaSv('heart')}</button><button class="fv" data-m="${i}" aria-label="Más opciones" title="Más opciones">${ondaSv('more')}</button></div>`;
}
function mark() { document.querySelectorAll('.row').forEach(r => r.classList.toggle('pl', cur[r.dataset.i] === q[ci])); const _hm = ci >= 0 && q[ci] && !playerHidden; $('.wrap').classList.toggle('np-on', _hm && /^(songs|favs|queue)$/.test(view)); }
function group(k) { const m = new Map; cur.forEach(t => { const g = k == 'al' ? t.al + '|' + t.a : t.a; (m.get(g) || m.set(g, []).get(g)).push(t); }); return [...m.values()]; }