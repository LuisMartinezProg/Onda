/* Modos de reproducción: recorrido, aleatorio, aleatorio después y repetir una.
   Un solo botón (#sh en el reproductor; cualquier botón con clase .btn-modo, como el del karaoke). */
const MODOS=[
 {n:'Recorrido',i:'<path d="M4 12h14"/><path d="M14 7l5 5-5 5"/>'},
 {n:'Aleatorio',i:'<path d="M3 7h3.5c2 0 3.2 1 4.3 2.8l2.4 4.4c1.1 1.8 2.3 2.8 4.3 2.8H21"/><path d="M18 14l3 3-3 3"/><path d="M3 17h3.5c1.1 0 2-.4 2.8-1.2"/><path d="M13 8.2C14 7.4 15.1 7 16.5 7H21"/><path d="M18 4l3 3-3 3"/>'},
 {n:'Aleatorio después',i:'<path d="M3 7h3.5c2 0 3.2 1 4.3 2.8l2.4 4.4c1.1 1.8 2.3 2.8 4.3 2.8H21"/><path d="M18 14l3 3-3 3"/><path d="M3 17h3.5c1.1 0 2-.4 2.8-1.2"/><path d="M13 8.2C14 7.4 15.1 7 16.5 7H21"/><path d="M18 4l3 3-3 3"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>'},
 {n:'Repetir una',i:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 013-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 01-3 3H3"/><path d="M11 10h1.5v5"/>'}
];
let _hist=[],_hp=-1,_colaFiltrada=false,_colaRef=null,_colaN=0,_avT=0;
const modoActual=()=>{const m=S.modo|0;return m>=0&&m<MODOS.length?m:0};
const modoAleatorio=()=>{const m=modoActual();return m===1||m===2};

/* Historial de lo que sonó de verdad (también lo elegido a mano) */
function histRegistrar(t){if(!t||_hist[_hp]===t)return;_hist.length=_hp+1;_hist.push(t);_hp=_hist.length-1;if(_hist.length>500){_hist.shift();_hp--}}

/* Una al azar que no haya sonado en esta ronda; si ya sonaron todas, empieza otra ronda */
function elegirAleatoria(){
 const vistas=new Set(_hist.slice(0,_hp+1)),c=[];
 q.forEach((t,i)=>{if(!vistas.has(t))c.push(i)});
 if(!c.length){const t=q[ci];_hist=t?[t]:[];_hp=_hist.length-1;q.forEach((_,i)=>{if(i!==ci)c.push(i)})}
 if(!c.length)return ci>=0?ci:0;
 return c[Math.floor(Math.random()*c.length)];
}
function indiceSiguiente(){
 if(modoAleatorio()){
  if(_hp>-1&&_hp<_hist.length-1){
   /* Aleatorio: si volviste atrás, lo de adelante se repite. Aleatorio después: se descarta y sale otra al azar sin perder lo anterior */
   if(modoActual()===1){const i=q.indexOf(_hist[_hp+1]);if(i>-1){_hp++;return i}}
   _hist.length=_hp+1;
  }
  return elegirAleatoria();
 }
 const n=ci+1;return n>=q.length?0:n;
}
function indiceAnterior(){
 if(modoAleatorio()){for(let k=_hp-1;k>=0;k--){const i=q.indexOf(_hist[k]);if(i>-1){_hp=k;return i}}return ci>=0?ci:0}
 return ci>0?ci-1:q.length-1;
}

/* Botón de modos (el icono cambia según el modo) */
function pintarBotonModo(){
 const m=modoActual(),d=MODOS[m];
 document.querySelectorAll('#sh,.btn-modo').forEach(b=>{
  b.innerHTML='<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+d.i+'</svg>';
  b.dataset.modo=m;b.classList.toggle('on',m>0);b.title=d.n;b.setAttribute('aria-label',d.n)});
}
function cambiarModo(){
 S.modo=(modoActual()+1)%MODOS.length;saveS();pintarBotonModo();
 const st=$('#st'),txt='Modo: '+MODOS[S.modo].n;
 if(st){const antes=st.textContent;st.textContent=txt;clearTimeout(_avT);_avT=setTimeout(()=>{if(st.textContent===txt)st.textContent=antes},2200)}
}
document.addEventListener('click',e=>{if(e.target.closest('#sh,.btn-modo'))cambiarModo()});

/* Continuidad tras buscar: si la cola salió de una búsqueda y se borra la búsqueda,
   la reproducción sigue con la lista normal desde la canción que suena */
const hayFiltro=()=>!!(srch.s||(srch.fk&&srch.fv));
function modosNotarOrigen(){
 if(!/^(songs|favs)$/.test(view)||q.length!==cur.length)return;
 for(let k=0;k<q.length;k++)if(q[k]!==cur[k])return;
 _colaFiltrada=hayFiltro();_colaRef=q;_colaN=q.length;
}
function continuarTrasBuscar(){
 if(!_colaFiltrada||hayFiltro()||!/^(songs|favs)$/.test(view)||ci<0)return;
 if(q!==_colaRef||q.length!==_colaN){_colaFiltrada=false;return} /* la cola se tocó a mano: se respeta */
 const i=cur.indexOf(q[ci]);if(i<0)return;
 q=cur.slice();ci=i;_colaFiltrada=false;
}
addEventListener('load',()=>{
 if(typeof render!=='function')return;
 const r0=render;
 render=function(){const r=r0.apply(this,arguments);try{continuarTrasBuscar()}catch(e){console.error('Onda: continuidad tras buscar',e)}return r};
 pintarBotonModo();
});
pintarBotonModo();