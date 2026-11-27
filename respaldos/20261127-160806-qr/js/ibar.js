/* Barra de iconos del panel derecho: EQ, temporizador, cola */
function ibar(){const t=q[ci];$$('#np .ib').forEach(b=>b.classList.toggle('on',b.dataset.i==iOpen||(b.dataset.i=='fav'&&t&&t.fav)));
 $('#nw').classList.toggle('qopen',iOpen=='q');
 if(!iOpen)return $('#ipn').innerHTML='';
 if(iOpen=='eq'){const cur=S.eq.join(',');let match=Object.keys(PRE).find(k=>PRE[k].join(',')==cur)||'';
  $('#ipn').innerHTML=`<div class="ctl">Modo<select id="ieqm"><option value="1"${S.eqauto?' selected':''}>Automático según la canción</option><option value="0"${S.eqauto?'':' selected'}>Elijo yo</option></select><span></span></div>
   <div class="pre">${Object.keys(PRE).map(k=>`<button class="chip${k==match?' on':''}" data-p="${k}">${k}</button>`).join('')}</div>`}
 else if(iOpen=='tmr'){const left=tmrEnd?Math.max(0,Math.round((tmrEnd-Date.now())/60000)):0;
  $('#ipn').innerHTML=`<p style="color:var(--dim);font-size:12px;text-align:center">${tmrEnd?'Se detiene en '+left+' min':'Apaga la reproducción después de un rato'}</p>
   <div class="pre">${[10,20,30,45,60].map(m=>`<button class="chip" data-tm="${m}">${m} min</button>`).join('')}${tmrEnd?'<button class="chip" data-tm="0">Cancelar</button>':''}</div>`}
 else if(iOpen=='q'){$('#ipn').innerHTML=q.length?`<div class="qlist">${q.map((t,i)=>`<div class="qrow${i==ci?' on':''}" data-qi="${i}"><span>${i+1}.</span><b>${esc(t.t)}</b><span class="al">${esc(t.a)}</span></div>`).join('')}</div>`:'<p style="color:var(--dim);font-size:12px;text-align:center">La cola está vacía</p>'}}
tmrId=setInterval(()=>{if(tmrEnd&&Date.now()>=tmrEnd){tmrEnd=0;A.pause();if(iOpen=='tmr')ibar()}},1000*15);
