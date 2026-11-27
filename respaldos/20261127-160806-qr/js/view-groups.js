/* Vista: Albumes y Artistas */
function viewGroups(v){
  const G=group(view=='albums'?'al':'a');window.G=G;v.innerHTML='<h2>'+(view=='albums'?'Álbumes':'Artistas')+'</h2><div class="grid">'+G.map((g,i)=>`<div class="card" data-g="${i}"><div class="th">${esc((view=='albums'?g[0].al:g[0].a)[0]||'♪')}</div><b>${esc(view=='albums'?g[0].al:g[0].a)}</b><span>${view=='albums'?esc(g[0].a)+' · ':''}${g.length} canciones</span></div>`).join('')+'</div>'
}
