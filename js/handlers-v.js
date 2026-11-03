/* Manejadores de la zona central (#v): clics, sliders, busqueda, orden y filtros */
$('#v').onclick=async e=>{const t=e.target,f=t.closest('[data-f]'),r=t.closest('[data-i]'),g=t.closest('[data-g]'),p=t.dataset.p,x=t.dataset.x;
 const ed=t.closest('[data-ed]');if(ed){openEd(cur[ed.dataset.ed]);return}
 if(f){const s=cur[f.dataset.f];s.fav=s.fav?0:1;f.classList.toggle('on',!!s.fav);save();return}
 if(r){const tr=cur[r.dataset.i];if(q[ci]===tr&&ci>=0){playerHidden=!playerHidden;$('.wrap').classList.toggle('np-on',!playerHidden&&/^(songs|favs|queue)$/.test(view));playerHidden?A.pause():A.play();return}playerHidden=false;q=view=='queue'?q:cur.slice();playAt(q.indexOf(tr),true);return}
 if(g){q=window.G[g.dataset.g].slice().sort((a,b)=>a.n-b.n);playAt(0);return}
 if(p){S.eq=PRE[p].slice();saveS();fx();render()}
 if(x=='np'||x=='rn'){const n=($('#pn').value||'').trim();if(!n)return;if(x=='np'){const id='p'+Date.now().toString(36);PFS.push({id,name:n});saveP();localStorage.setItem('onda.pf',id);location.reload()}else{PFS.find(p=>p.id==PF).name=n;saveP();$('#pfl').textContent='Perfil: '+n;render()}}
 if(x=='dp'&&await window.showConfirm('¿Eliminar este perfil con su biblioteca y ajustes?')){PFS.splice(PFS.findIndex(p=>p.id==PF),1);saveP();indexedDB.deleteDatabase('onda-'+PF);localStorage.removeItem(SK);localStorage.setItem('onda.pf','default');location.reload()}
 if(x=='rf'&&window.onda){const d=t.dataset.d;await onda.remove(PF,d);window.FOL=(window.FOL||[]).filter(f=>f!=d);lib=lib.filter(s=>s.d!=d);save();$('#st').textContent=lib.length+' canciones';render()}
 if(x=='re'){for(const d of roots)await d.requestPermission({mode:'read'});$('#st').textContent='Carpetas reconectadas'}
 if(x=='out'){sessionStorage.removeItem('onda.picked');location.reload();return}if(x=='rt'){S.hue=330;S.themeBg=null;saveS();theme();render()}if(x=='cl'&&await window.showConfirm('¿Borrar la biblioteca guardada?')){lib=[];roots=[];ci=-1;q=[];kv('put','lib',[]);kv('put','roots',[]);render()}};
$('#v').oninput=e=>{const t=e.target,d=t.dataset;if(d.bd!=null)return setBg({dim:+t.value});if(d.e!=null)S.eq[d.e]=+t.value;else if(d.k){S[d.k]=t.type=='checkbox'?+t.checked:+t.value;if(t.nextElementSibling&&t.type=='range')t.nextElementSibling.textContent=d.k=='hue'?'':S[d.k]+(d.k=='bass'?' dB':d.k=='fade'?'s':d.k=='norm'?('%'):'×')}saveS();fx();theme()};
$('#v').addEventListener('change',e=>{if(e.target.id=='pf'){localStorage.setItem('onda.pf',e.target.value);location.reload()}});
let _pasting=false;$('#v').addEventListener('paste',e=>{if(e.target.id=='s'){_pasting=true;setTimeout(()=>{_pasting=false},50)}},true);$('#v').addEventListener('input',e=>{if(e.target.id=='s'){if(_pasting){setTimeout(()=>$('#v').dispatchEvent(new Event('input',{bubbles:true})),0);return}const pos=e.target.selectionStart;render();const inp=document.getElementById('s');if(inp){inp.focus();try{inp.setSelectionRange(pos,pos)}catch(_){}}}});
$('#v').addEventListener('change',e=>{const t=e.target;if(t.id=='o')render();
 if(t.id=='fk'){const k=t.value,f=$('#fv');f.hidden=!k;f.innerHTML=k?'<option value="">Todos</option>'+[...new Set(lib.map(x=>x[k]))].sort().map(x=>`<option>${esc(x)}</option>`).join(''):'';render()}
 if(t.id=='fv')render()});
