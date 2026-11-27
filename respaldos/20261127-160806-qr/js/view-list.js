/* Vista: Canciones, Favoritas y Cola */
function viewList(v) {
  const T = { songs: 'Canciones', favs: 'Favoritas', queue: 'Cola' }[view];
  const sel = window.__ondaSel, o = ordKnown(srch.o), lab = (ORD.find(x => x[0] === o) || ORD[0])[1];
  const sonando = ci >= 0 && q[ci];
  let tools = '';
  if (view === 'songs') tools += '<button class="tbtn" data-act="clean" title="Limpiar títulos (Título / Artista / Género)" aria-label="Limpiar títulos">' + ondaSv('wand', '1em') + '</button>';
  if (view === 'songs') tools += '<button class="tbtn" id="onda-loc" data-act="loc" title="Ubicar la canción que suena" aria-label="Ubicar la canción que suena"' + (sonando ? '' : ' hidden') + '>' + ondaSv('locate', '1em') + '</button>';
  tools += '<button class="tbtn' + (sel.on ? ' on' : '') + '" data-act="sel" title="Seleccionar canciones" aria-label="Seleccionar canciones">' + ondaSv('select', '1em') + '</button>';
  if (view !== 'queue') tools += '<button class="tbtn" data-act="ord" title="Ordenar: ' + lab + '" aria-label="Ordenar">' + ondaSv(o, '1em') + '</button>';

  let vacio = 'No hay canciones que coincidan con la búsqueda.';
  if (view === 'queue') vacio = 'La cola está vacía.';
  else if (!lib.length) vacio = 'Aún no hay canciones. Usa «Añadir carpeta».';
  else if (view === 'favs' && !srch.s && !srch.fk) vacio = 'Todavía no tienes favoritas. Toca el corazón de una canción.';

  v.innerHTML = '<div class="lhead"><h2>' + T + '</h2><div class="ltools">' + tools + '</div></div>'
    + '<div class="srch"><input id="s" type="search" placeholder="Buscar canción, artista o álbum" aria-label="Buscar" value="' + esc(srch.s) + '">'
    + '<select id="fk" aria-label="Ver por"><option value=""' + (srch.fk == '' ? ' selected' : '') + '>Todo</option><option value="a"' + (srch.fk == 'a' ? ' selected' : '') + '>Artista</option><option value="al"' + (srch.fk == 'al' ? ' selected' : '') + '>Álbum</option></select>'
    + '<select id="fv"' + (srch.fk ? '' : ' hidden') + ' aria-label="Elegir">' + (srch.fk ? '<option value="">Todos</option>' + [...new Set(lib.map(x => x[srch.fk]))].sort().map(x => `<option${x == srch.fv ? ' selected' : ''}>${esc(x)}</option>`).join('') : '') + '</select></div>'
    + (cur.length ? cur.map(row).join('') : '<p style="color:var(--dim);padding:24px 4px">' + vacio + '</p>');
}