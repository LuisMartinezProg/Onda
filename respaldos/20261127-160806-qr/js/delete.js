/* Borrar canciones - boton dentro del dialog de Editar.
   Al borrar se quitan TODAS las entradas del mismo archivo (copias) y la cola se reajusta. */
let _delSong=null;

/* Ruta del archivo de una cancion */
function _rutaSync(t){
  if(!t)return null;
  if(t.p&&t.p[0]&&/^([a-zA-Z]:[\\\/]|\\\\)/.test(t.p[0]))return t.p[0];
  if(t.d&&t.p&&t.p.length)return t.d.replace(/[\\\/]+$/,'')+'\\'+t.p.join('\\');
  if(t.u&&t.u.indexOf('?p=')>-1){
    try{ return decodeURIComponent(t.u.split('?p=')[1]); }catch(e){ return null; }
  }
  return null;
}
async function songPath(t){ return _rutaSync(t); }

/* Misma ruta sin importar mayusculas ni el tipo de barra */
function _claveRuta(t){
  const p=_rutaSync(t);
  return p?String(p).replace(/\//g,'\\').replace(/\\+$/,'').toLowerCase():'';
}
/* Todas las entradas de la biblioteca que son el mismo archivo */
function _copiasDe(t){
  const k=_claveRuta(t);
  const r=lib.filter(x=>x===t||(t.u&&x.u===t.u)||(k&&_claveRuta(x)===k));
  if(!r.includes(t))r.push(t);
  return r;
}

async function doDelete(mode){
  const t=_delSong;
  if(!t)return;
  const dlg=document.getElementById('deld');
  const h=document.getElementById('deld-h');
  const bLib=document.getElementById('deld-lib');
  const bDisk=document.getElementById('deld-disk');
  const bCancel=document.getElementById('deld-cancel');
  const libre=()=>{
    if(bLib)bLib.disabled=false;
    if(bDisk)bDisk.disabled=false;
    if(bCancel)bCancel.disabled=false;
    if(h)h.textContent='Borrar canci\u00f3n';
  };

  if(mode==='cancel'){ if(dlg)dlg.close(); _delSong=null; return; }

  if(bLib)bLib.disabled=true;
  if(bDisk)bDisk.disabled=true;
  if(bCancel)bCancel.disabled=true;
  if(h)h.textContent='Borrando\u2026';

  try{
    if(mode==='disk'){
      const p=await songPath(t);
      if(!p){
        window.showAlert('No se puede borrar del disco: no hay ruta conocida.');
        libre();
        return;
      }
      if(typeof t.r==='number'&&t.r>=0&&typeof roots!=='undefined'&&roots[t.r]){
        try{
          const perm=await roots[t.r].requestPermission({ mode:'readwrite' });
          if(perm!=='granted'){
            window.showAlert('Permiso de escritura denegado.');
            libre();
            return;
          }
        }catch(e){}
      }
      if(window.onda&&window.onda.fileDelete){
        const r=await window.onda.fileDelete(PF,p);
        const yaNoEsta=!!(r&&!r.ok&&/ENOENT|no such file|no existe|not found/i.test(String(r.error||'')));
        if(!r||(!r.ok&&!yaNoEsta)){
          window.showAlert('No se pudo borrar: '+((r&&r.error)||'desconocido'));
          libre();
          return;
        }
      }
    }

    /* Quitar la cancion y todas sus copias, y reajustar la cola */
    const copias=_copiasDe(t);
    const sonando=(ci>=0&&q[ci])?q[ci]:null;
    if(mode==='lib')copias.forEach(x=>ocultarCancion(x));
    lib=lib.filter(x=>!copias.includes(x));
    q=q.filter(x=>!copias.includes(x));
    if(sonando&&copias.includes(sonando)){ A.pause(); A.src=''; ci=-1; }
    else ci=sonando?q.indexOf(sonando):-1;
    try{ const sel=window.__ondaSel; if(sel&&sel.set)copias.forEach(x=>sel.set.delete(x)); }catch(e){}
    if(typeof save==='function')save();
    if(typeof render==='function')render();
    if(typeof ibar==='function')ibar();
  }catch(e){
    window.showAlert('Error: '+(e&&e.message||e));
  }
  if(dlg)dlg.close();
  _delSong=null;
  libre();
}

document.addEventListener('click',e=>{
  // Click en el boton borrar (dentro del dialog Editar)
  if(e.target.closest('#e-del')){
    e.stopPropagation();
    e.preventDefault();
    if(!et)return;
    _delSong=et;
    const dlg=document.getElementById('deld');
    const nm=document.getElementById('deld-name');
    const h=document.getElementById('deld-h');
    // Cerrar el dialog de editar antes para no anidar modales
    const ed=document.getElementById('ed');
    if(ed&&ed.open)ed.close();
    if(nm)nm.textContent=(_delSong.t||'')+(_delSong.a?' \u2014 '+_delSong.a:'');
    if(h)h.textContent='Borrar canci\u00f3n';
    if(dlg)dlg.showModal();
    return;
  }
  if(e.target.closest('#deld-cancel')){ doDelete('cancel'); }
  else if(e.target.closest('#deld-lib')){ doDelete('lib'); }
  else if(e.target.closest('#deld-disk')){ doDelete('disk'); }
},true);
/* Canciones quitadas "solo de la app": no vuelven al reescanear */
const _OCK='onda.ocultas.'+PF;
function ocultasGet(){try{return new Set(JSON.parse(localStorage.getItem(_OCK)||'[]'))}catch(e){return new Set()}}
function ocultarCancion(t){if(!t||!t.u)return;const s=ocultasGet();s.add(t.u);try{localStorage.setItem(_OCK,JSON.stringify([...s]))}catch(e){console.error('Onda: ocultas',e)}}