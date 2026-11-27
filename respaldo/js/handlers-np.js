/* Manejadores del panel derecho (#np): iconos, EQ, temporizador, cola */
$('#np').addEventListener('click',e=>{
 const ed=e.target.closest('[data-ed]');if(ed)return openEd(q[ci]);
 const ib=e.target.closest('.ib');
 if(ib){const k=ib.dataset.i;
  if(k=='fav'){const t=q[ci];if(!t)return;t.fav=t.fav?0:1;save();ibar();mark();return}
  if(k=='add'){const t=q[ci];if(!t||ci<0)return;if(q[ci+1]!==t)q.splice(ci+1,0,t);ibar();return}
  if(k=='ly'){const el=document.getElementById('lyr');if(el)el.classList.toggle('on');return}iOpen=iOpen==k?'':k;ibar();return}
 const p=e.target.closest('[data-p]');if(p){S.eq=PRE[p.dataset.p].slice();S.eqauto=0;saveS();fx();ibar();return}
 const tm=e.target.closest('[data-tm]');if(tm){const m=+tm.dataset.tm;tmrEnd=m?Date.now()+m*60000:0;ibar();return}
 const sel=e.target.closest('#ieqm');if(sel)return;
 const qi=e.target.closest('[data-qi]');if(qi){playAt(+qi.dataset.qi);ibar();return}});
$('#ipn').addEventListener('change',e=>{if(e.target.id=='ieqm'){S.eqauto=+e.target.value;saveS();if(S.eqauto&&q[ci]){const g=guessPre(q[ci]);S.eq=PRE[g].slice();saveS();fx()}ibar()}});
