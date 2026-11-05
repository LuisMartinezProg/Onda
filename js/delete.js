/* Borrar canciones — boton dentro del dialog de Editar */
let _delSong=null;

async function songPath(t){
  if(!t)return null;
  if(t.d&&t.p&&t.p.length)return t.d.replace(/[\\\/]+$/,'')+'\\'+t.p.join('\\');
  if(t.u&&t.u.indexOf('?p=')>-1){
    try{ return decodeURIComponent(t.u.split('?p=')[1]); }catch(e){ return null; }
  }
  return null;
}

async function doDelete(mode){
  const t=_delSong;
  if(!t)return;
  const dlg=document.getElementById('deld');
  const h=document.getElementById('deld-h');
  const bLib=document.getElementById('deld-lib');
  const bDisk=document.getElementById('deld-disk');
  const bCancel=document.getElementById('deld-cancel');

  if(mode==='cancel'){ if(dlg)dlg.close(); _delSong=null; return; }

  if(bLib)bLib.disabled=true;
  if(bDisk)bDisk.disabled=true;
  if(bCancel)bCancel.disabled=true;
  if(h)h.textContent='Borrando…';

  try{
    if(mode==='disk'){
      const p=songPath(t);
      if(!p){
        window.showAlert('No se puede borrar del disco: no hay ruta conocida.');
        if(bLib)bLib.disabled=false;
        if(bDisk)bDisk.disabled=false;
        if(bCancel)bCancel.disabled=false;
        if(h)h.textContent='Borrar canción';
        return;
      }
      if(typeof t.r==='number'&&t.r>=0&&typeof roots!=='undefined'&&roots[t.r]){
        try{
          const perm=await roots[t.r].requestPermission({ mode:'readwrite' });
          if(perm!=='granted'){
            window.showAlert('Permiso de escritura denegado.');
            if(bLib)bLib.disabled=false;
            if(bDisk)bDisk.disabled=false;
            if(bCancel)bCancel.disabled=false;
            if(h)h.textContent='Borrar canción';
            return;
          }
        }catch(e){}
      }
      if(window.onda&&window.onda.fileDelete){
        const r=await window.onda.fileDelete(PF,p);
        if(!r||!r.ok){
          window.showAlert('No se pudo borrar: '+((r&&r.error)||'desconocido'));
          if(bLib)bLib.disabled=false;
          if(bDisk)bDisk.disabled=false;
          if(bCancel)bCancel.disabled=false;
          if(h)h.textContent='Borrar canción';
          return;
        }
      }
    }
    lib=lib.filter(x=>x!==t);
    q=q.filter(x=>x!==t);
    if(q[ci]===t){ A.pause(); A.src=''; ci=-1; }
    if(typeof save==='function')save();
    if(typeof render==='function')render();
    if(typeof ibar==='function')ibar();
  }catch(e){
    window.showAlert('Error: '+(e&&e.message||e));
  }
  if(dlg)dlg.close();
  _delSong=null;
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
    if(nm)nm.textContent=(_delSong.t||'')+(_delSong.a?' — '+_delSong.a:'');
    if(h)h.textContent='Borrar canción';
    if(dlg)dlg.showModal();
    return;
  }
  if(e.target.closest('#deld-cancel')){ doDelete('cancel'); }
  else if(e.target.closest('#deld-lib')){ doDelete('lib'); }
  else if(e.target.closest('#deld-disk')){ doDelete('disk'); }
},true);