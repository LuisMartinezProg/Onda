/* Editar cancion y caratula */
/* ---- Editar canción ---- */
let et=null,ecv,playerHidden=false;
function openEd(t){if(!t)return;et=t;ecv=undefined;$('#e1').value=t.t;$('#e2').value=t.a;$('#e3').value=t.al;$('#e4').value='';$('#gb').style.display='none';$('#e9').value='';$('#ed').showModal()}
$('#e4').onchange=async e=>{const f=e.target.files[0];if(!f)return;ecv=await toCover(f)};
$('#e6').onclick=()=>ecv='';$('#e7').onclick=()=>$('#ed').close();
$('#e8').onclick=()=>{const q=encodeURIComponent((($('#e2').value||'').trim()+' '+($('#e1').value||'').trim()+' carátula álbum').trim());
 const url='https://www.google.com/search?tbm=isch&q='+q;if(window.onda&&onda.openExternal)onda.openExternal(url);else window.open(url,'_blank');
 $('#gb').style.display='flex';$('#e9').focus()};
$('#e10').onclick=async()=>{const u=($('#e9').value||'').trim();if(!/^https?:\/\//i.test(u))return window.showAlert('Pega una URL de imagen que empiece por http:// o https://');
 const btn=$('#e10');btn.disabled=true;btn.textContent='Descargando…';
 try{if(!window.onda||!onda.fetchImage)throw 0;const g=await onda.fetchImage(u);if(!g)throw 0;
  const b=await(await fetch('data:'+g.type+';base64,'+g.data)).blob();ecv=await toCover(b);$('#gb').style.display='none';$('#e9').value='';(()=>{const h=document.querySelector('#ed h2');const t=h.textContent;h.textContent='✓ Imagen cargada';setTimeout(()=>h.textContent=t,1500)})()}
 catch(e){window.showAlert('No se pudo descargar esa imagen. En Google Imágenes, clic derecho sobre la foto → «Copiar dirección de la imagen», y pega esa URL aquí.')}
 finally{btn.disabled=false;btn.textContent='Usar'}};
async function extractHueAsk(blob){try{const m=await createImageBitmap(blob),cv=document.createElement('canvas');cv.width=80;cv.height=80;const x=cv.getContext('2d');x.drawImage(m,0,0,80,80);const d=x.getImageData(0,0,80,80).data;const bk=new Map();for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];if(a<128)continue;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn<20)continue;if(mx>235&&mn>190)continue;if(mx<20)continue;const kr=(r>>4)<<4,kg=(g>>4)<<4,kb=(b>>4)<<4;const key=kr+','+kg+','+kb;const p=bk.get(key)||{r:0,g:0,b:0,n:0};p.r+=r;p.g+=g;p.b+=b;p.n++;bk.set(key,p)}if(!bk.size)return;const srt=[...bk.values()].sort((a,b)=>b.n-a.n);let best=srt[0],bestSat=0;for(const c of srt.slice(0,20)){if(c.n<8)continue;const r=c.r/c.n/255,g=c.g/c.n/255,b=c.b/c.n/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);const sat=mx==mn?0:(mx-mn)/(1-Math.abs(mx+mn-1));if(sat>bestSat){bestSat=sat;best=c}}const r1=best.r/best.n/255,g1=best.g/best.n/255,b1=best.b/best.n/255;const mx=Math.max(r1,g1,b1),mn=Math.min(r1,g1,b1);let hue=0;if(mx!=mn){if(mx==r1)hue=((g1-b1)/(mx-mn)+6)%6;else if(mx==g1)hue=(b1-r1)/(mx-mn)+2;else hue=(r1-g1)/(mx-mn)+4;hue*=60}hue=Math.round(hue);const bg='hsl('+hue+' 22% 7%)';const bg2='hsl('+hue+' 26% 11%)';if(!await window.showConfirm('\u00bfAplicar los colores de la imagen a toda la app?'))return;S.hue=hue;S.themeBg={bg:bg,bg2:bg2};saveS();theme()}catch(e){}}
async function shrinkImg(f,maxW=1920){try{const m=await createImageBitmap(f);if(m.width<=maxW)return f;const k=maxW/m.width,cv=document.createElement('canvas');cv.width=maxW;cv.height=Math.round(m.height*k);cv.getContext('2d').drawImage(m,0,0,cv.width,cv.height);return await new Promise(r=>cv.toBlob(b=>r(new File([b],f.name||'bn.jpg',{type:'image/jpeg'})),'image/jpeg',.88))}catch(e){return f}}
async function toCover(f){const m=await createImageBitmap(f),k=Math.min(1,500/Math.max(m.width,m.height)),c=document.createElement('canvas');c.width=m.width*k;c.height=m.height*k;c.getContext('2d').drawImage(m,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.85)}
$('#e5').onclick=()=>{if(!et)return;et.t=$('#e1').value.trim()||et.t;et.a=$('#e2').value.trim()||'Artista desconocido';et.al=$('#e3').value.trim()||'Álbum desconocido';if(ecv!==undefined){if(ecv)et.cv=ecv;else delete et.cv}save();$('#ed').close();
 if(q[ci]===et)info(et);render()};
