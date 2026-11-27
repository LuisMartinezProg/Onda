/* Fondos por seccion */
/* ---- Fondos por sección ---- */
const BGK={all:'Todas las secciones',songs:'Canciones',favs:'Favoritas',albums:'Álbumes',artists:'Artistas',queue:'Cola',sound:'Sonido',set:'Ajustes'};let bk='all',bgSig='',bgUrl='';
const bcur=()=>S.bg&&S.bg[bk]||(bk=='all'?{m:'grad'}:{m:'inh'});
function setBg(p){S.bg=S.bg||{};const c=Object.assign({},bcur(),p);if(c.m=='inh')delete S.bg[bk];else S.bg[bk]=c;saveS();applyBg()}
async function applyBg(){const b=S.bg&&(S.bg[view]||S.bg.all)||{m:'grad'},e=$('#bgl');e.style.setProperty('--bd',b.dim||0);const sig=JSON.stringify({...b,dim:0});if(sig==bgSig)return;bgSig=sig;e.className=b.m=='aur'?'aur':'';e.style.setProperty('--bgc',b.m=='color'?b.c:'transparent');e.replaceChildren();
 if(b.m=='file'){const f=await kv('get','bg:'+b.k);if(!f||sig!=bgSig)return;URL.revokeObjectURL(bgUrl);bgUrl=URL.createObjectURL(f);const m=document.createElement(f.type.startsWith('video')?'video':'img');m.src=bgUrl;if(m.tagName=='VIDEO'){m.autoplay=m.loop=m.muted=m.playsInline=true}e.append(m)}}
function bgUI(){const b=bcur(),o=[['inh','Igual que «Todas»'],['grad','Degradado de Onda'],['aur','Aurora animada'],['color','Color liso'],['file','Imagen o video propio']].filter(x=>bk!='all'||x[0]!='inh');
 return`<div class="ctl">Sección<select id="bk">${Object.entries(BGK).map(([k,n])=>`<option value="${k}"${k==bk?' selected':''}>${n}</option>`).join('')}</select><span></span></div><div class="ctl">Fondo<select id="bm">${o.map(x=>`<option value="${x[0]}"${x[0]==b.m?' selected':''}>${x[1]}</option>`).join('')}</select><span></span></div>`
 +(b.m=='color'?`<div class="ctl">Color<input type="color" id="bc" value="${b.c||'#140e24'}"><span></span></div>`:'')+(b.m=='file'?`<div class="ctl">Archivo<input type="file" id="bf" accept="image/*,video/*"><span>${b.k?'✓':''}</span></div>`:'')
 +(/aur|color|file/.test(b.m)?`<div class="ctl">Oscurecer<input type="range" min="0" max=".85" step=".05" value="${b.dim||0}" data-bd="1"><span></span></div>`:'')}
$('#v').addEventListener('change',async e=>{const t=e.target;if(t.id=='bk'){bk=t.value;render()}if(t.id=='bm'){setBg({m:t.value});render()}if(t.id=='bc')setBg({c:t.value});
 if(t.id=='bf'&&t.files[0]){await kv('put','bg:'+bk,t.files[0]);setBg({m:'file',k:bk,v:Date.now()});render()}});
