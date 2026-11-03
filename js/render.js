/* render(): prepara la pantalla, filtra la biblioteca y llama a la vista activa */
function render(){
  // Limpiar elementos flotantes que se quedan "pegados" al cambiar de vista
  const _floaters = document.querySelectorAll('#preview-audio-container, #yt-preview-modal');
  _floaters.forEach(el => el.remove());
  // Forzar un repintado para eliminar fantasmas visuales
  document.body.style.opacity = '0.99';
  requestAnimationFrame(() => { document.body.style.opacity = '1'; });
const addBtn=document.getElementById("add");if(addBtn){addBtn.style.display=/^(songs|favs|queue|albums|artists)$/.test(view)?"":"none";}const _ik=view==='karaoke';document.body.classList.toggle('karaoke-view',_ik);const _sd=document.querySelector('.side'),_ap=document.getElementById('app');if(_sd){_sd.style.display=_ik?'none':'';_sd.style.width=_ik?'0':''}if(_ap){_ap.style.gridTemplateColumns=_ik?'1fr':''};
  const _hm = ci >= 0 && q[ci] && !playerHidden;
  $('.wrap').classList.toggle('np-on', _hm && /^(songs|favs|queue)$/.test(view));
  applyBg();applyBn();kick();
  const v=$('#v'),s=($('#s')?$('#s').value:srch.s).toLowerCase(),o=($('#o')?$('#o').value:srch.o);
 srch.s=$('#s')?$('#s').value:srch.s;srch.o=o;srch.fk=$('#fk')?$('#fk').value:srch.fk;srch.fv=$('#fv')?$('#fv').value:srch.fv;
 const fk=srch.fk,fv=srch.fv;cur=lib.filter(t=>(!s||(t.t+t.a+t.al).toLowerCase().includes(s))&&(!fk||!fv||t[fk]==fv)).sort((a,b)=>o==='at'?((b.at||0)-(a.at||0)):(a[o].localeCompare(b[o])||a.n-b.n));
 if(view=='favs')cur=cur.filter(t=>t.fav);if(view=='queue')cur=q;
  if(view=='songs'||view=='favs'||view=='queue')viewList(v);
  else if(view=='albums'||view=='artists')viewGroups(v);
  else if(view=='downloads')viewDownloads(v);
  else if(view=='videos')viewVideos(v);
  else if(view=='karaoke')viewKaraoke(v);
  else if(view=='sound')viewSound(v);
  else viewSettings(v);
}
