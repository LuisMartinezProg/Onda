/* Estado global, almacenamiento (IndexedDB/localStorage), tema */
const PF=localStorage.getItem('onda.pf')||'default',SK=PF=='default'?'onda':'onda.'+PF,PFS=JSON.parse(localStorage.getItem('onda.profiles')||'[{"id":"default","name":"Principal"}]'),saveP=()=>localStorage.setItem('onda.profiles',JSON.stringify(PFS));
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],A=new Audio(),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AUD=/\.(mp3|mpeg|mpga|flac|m4a|aac|ogg|oga|opus|wav|weba)$/i,PRE={Plano:[0,0,0,0,0,0,0,0,0,0],Graves:[6,5,4,2,0,0,0,0,0,0],Voz:[-2,-1,0,2,4,4,3,1,0,-1],Rock:[4,3,1,-1,-2,0,2,3,4,4],Electrónica:[5,4,1,0,-2,2,1,3,4,5],Acústico:[3,3,2,1,1,1,2,2,3,2]},FQ=['32','64','125','250','500','1k','2k','4k','8k','16k'];
let lib=[],roots=[],q=[],ci=-1,view='songs',ctx,N={},cur=[],srch={s:'',o:'t',fk:'',fv:''},iOpen='',tmrId=0,tmrEnd=0,S=Object.assign({hue:330,amo:0,eco:0,eq:Array(10).fill(0),bass:0,wid:1,pre:1,eqauto:1,fade:2,norm:1},JSON.parse(localStorage.getItem(SK)||'{}'));
const db=new Promise(r=>{const o=indexedDB.open(PF=='default'?'onda':'onda-'+PF,1);o.onupgradeneeded=()=>o.result.createObjectStore('k');o.onsuccess=()=>r(o.result)});
const kv=async(m,k,v)=>{const d=await db;return new Promise(r=>{const s=d.transaction('k',m=='get'?'readonly':'readwrite').objectStore('k'),x=m=='get'?s.get(k):s.put(v,k);x.onsuccess=()=>r(x.result)})};
const save=()=>kv('put','lib',lib.filter(t=>t.r>=0||t.u).map(({f,...t})=>t)),saveS=()=>localStorage.setItem(SK,JSON.stringify(S));
const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+('0'+Math.floor(s%60)).slice(-2):'0:00';
function theme(){document.documentElement.style.setProperty('--h',S.hue);document.body.classList.toggle('amo',!!S.amo);document.body.classList.toggle('eco',!!S.eco)}
