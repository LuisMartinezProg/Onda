/* Imagen o animacion de cabecera */
/* ---- Imagen de cabecera (banner) ---- */
const BNFMT=/^(image\/(jpeg|png|webp|gif)|video\/mp4)$/;
let _bnGen=0; let _bnCache=null;async function applyBn(){const _g=++_bnGen;const e=$('#bn'); const f=await kv('get','bn');if(_g!==_bnGen)return; if(_bnCache && f && _bnCache.size===f.size && _bnCache.type===f.type) return; _bnCache=f; e.replaceChildren();if(!f){document.documentElement.style.setProperty('--bnh','60px');return}
 const url=URL.createObjectURL(f),isV=f.type.startsWith('video'),m=document.createElement(isV?'video':'img');m.src=url;if(isV){m.autoplay=m.loop=m.muted=m.playsInline=true}
 e.append(m);
 const setH=ratio=>{
   const w = e.clientWidth || window.innerWidth || 800;
   const minH = 90;const _r=ratio||3;let maxH=_r<1.5?320:_r<2.5?280:_r<4?240:200;
   const h = Math.min(maxH, Math.max(minH, Math.round(w / (ratio || 3))));
   document.documentElement.style.setProperty('--bnh', h + 'px');
 };
 if(isV) m.onloadedmetadata=()=>setH(m.videoWidth/m.videoHeight||3);
 else    m.onload=()=>setH(m.naturalWidth/m.naturalHeight||3);
 addEventListener('resize',()=>{
   if(isV) setH(m.videoWidth/m.videoHeight||3);
   else    setH(m.naturalWidth/m.naturalHeight||3);
 },{once:false});
}
$('#bn').onclick=()=>{$('#b2').style.display='none';$('#b1').value='';$('#bnd').showModal()};
$('#b1').onchange=e=>{_bnCache=null;const f=e.target.files[0],w=$('#b2');w.style.display='none';if(!f)return;
 if(!BNFMT.test(f.type)){w.textContent='Formato no admitido. Usa JPG, PNG, WEBP, GIF o MP4.';w.style.display='block';e.target.value='';return}
 if(f.size>15*1024*1024){w.textContent='El archivo pesa más de 15 MB.';w.style.display='block';e.target.value='';return}kv('put','bn',f).then(()=>{applyBn();document.getElementById('bnd').close()})};
$('#b3').onclick=async()=>{_bnCache=null;const f=$('#b1').files[0];if(!f)return;const _sf=await shrinkImg(f);await kv('put','bn',_sf);applyBn();$('#bnd').close();extractHueAsk(f)};
$('#b4').onclick=async()=>{_bnCache=null;
  await kv('put','bn',null);
  applyBn();
  // Restaurar color por defecto de la app
  document.documentElement.style.removeProperty('--acc');
  document.documentElement.style.removeProperty('--acc2');
  $('#bnd').close();
};
$('#b5').onclick=()=>$('#bnd').close();$('#b9').onclick=async()=>{_bnCache=null;const u=($('#b8').value||'').trim();if(!/^https?:\/\//i.test(u)){const w=$('#b2');w.textContent='Pega una URL que empiece por http:// o https://';w.style.display='block';$('#b8').focus();return}const btn=$('#b9');btn.disabled=true;btn.textContent='Descargando...';try{if(!window.onda||!onda.fetchImage)throw 0;const g=await onda.fetchImage(u);if(!g)throw 0;const b=await(await fetch('data:'+g.type+';base64,'+g.data)).blob();await kv('put','bn',b);await applyBn();extractHueAsk(b);$('#bnd').close();$('#b8').value=''}catch(e){const w=$('#b2');w.textContent='No se pudo descargar. Verifica que la URL sea una imagen directa (termina en .jpg, .png).';w.style.display='block'}finally{btn.disabled=false;btn.textContent='Usar URL'}};$('#b6').onclick=()=>{const inp=$('#b7');const k=(inp.value||'').trim();if(!k){$('#b2').textContent='Escribe un personaje, serie o tema';$('#b2').style.display='block';inp.focus();return}const q=encodeURIComponent(k+' wallpaper pc');const url='https://www.google.com/search?tbm=isch&q='+q+'&tbs=isz:l,iar:w';if(window.onda&&onda.openExternal)onda.openExternal(url);else window.open(url,'_blank')};
