/* Vista: Descargas */
let _dlTab='all', _dlItems=[], _dlBound=false;

async function dlRefresh(){
  if(!window.onda||!window.onda.download)return;
  try{ _dlItems = await window.onda.download.history(PF); }catch(e){ _dlItems=[]; }
  dlRender();
}

function dlRender(){
  const box=document.getElementById('dl-list');
  if(!box)return;
  let items=_dlItems.slice();
  if(_dlTab==='done')items=items.filter(x=>x.status==='done');
  else if(_dlTab==='running')items=items.filter(x=>x.status==='running');
  else if(_dlTab==='cancel')items=items.filter(x=>x.status==='cancelled'||x.status==='error');
  if(!items.length){
    box.innerHTML='<p style="color:var(--dim);text-align:center;padding:40px 20px">Sin descargas en esta categoría.</p>';
    return;
  }
  box.innerHTML=items.map(x=>{
    const pct=x.status==='done'?100:(x.progress||0);
    const stLabel = x.status==='done'?'✅':x.status==='running'?'⬇':x.status==='cancelled'?'⛔':'⚠';
    const title=esc(x.title||'Descarga '+(x.id||''));
    const url=esc(x.url||'');
    const sub=esc((x.file||url).split(/[\\\/]/).pop());
    return `<div class="dl-row" data-id="${x.id}">
      <div class="dl-ico">${stLabel}</div>
      <div class="dl-info">
        <b>${title}</b>
        <span>${sub}</span>
        ${x.status==='running'?`<div class="dl-bar"><i style="width:${pct}%"></i></div>`:''}
      </div>
      <div class="dl-acts">
        ${x.status==='running'?`<button class="dl-btn" data-act="cancel" title="Cancelar y borrar">⛔</button>`:''}
        <button class="dl-btn" data-act="remove" title="Quitar de la lista">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function viewDownloads(v){
  v.innerHTML=`<h2>Descargas</h2>
    <div class="dl-head">
      <input id="dl-url" type="text" placeholder="Pega una URL de YouTube o escribe para buscar..." spellcheck="false">
      <button id="dl-go" class="dl-main">⬇ Descargar URL</button>
    </div>
    <div class="dl-aux">
      <button id="dl-search" class="dl-chip">🔍 Buscar en YouTube</button>
      <button id="dl-open" class="dl-chip">📂 Abrir carpeta</button>
    </div>
    <div id="dl-results" class="dl-results"></div>
    <div class="dl-tabs">
      <button data-dt="all" class="${_dlTab==='all'?'on':''}">Todo</button>
      <button data-dt="done" class="${_dlTab==='done'?'on':''}">Descargados</button>
      <button data-dt="running" class="${_dlTab==='running'?'on':''}">En proceso</button>
      <button data-dt="cancel" class="${_dlTab==='cancel'?'on':''}">Canceladas</button>
    </div>
    <div id="dl-list"><p style="color:var(--dim);text-align:center;padding:40px 20px">Cargando...</p></div>`;
  dlBind();
  dlRefresh();
}

function dlBind(){
  const url=document.getElementById('dl-url');
  const go=document.getElementById('dl-go');
  const sBtn=document.getElementById('dl-search');
  const oBtn=document.getElementById('dl-open');
  const tabs=document.querySelector('.dl-tabs');
  const list=document.getElementById('dl-list');
  const results=document.getElementById('dl-results');

  if(go)go.onclick=async()=>{
    const u=(url&&url.value||'').trim();
    if(!u)return;
    go.disabled=true;go.textContent='Iniciando...';
    try{
      const r=await window.onda.download.start(u,PF,'',true);
      if(r&&r.error) await window.showAlert('Error: '+r.error);
      else if(r&&r.duplicated) await window.showAlert('Ya se está descargando esa URL');
      else{ url.value=''; await dlRefresh(); }
    }catch(e){ await window.showAlert('Error: '+(e&&e.message||e)); }
    finally { go.disabled=false;go.textContent='⬇ Descargar URL'; }
  };

  if(url)url.onkeydown=e=>{ if(e.key==='Enter'&&go)go.click(); };

  if(sBtn)sBtn.onclick=async()=>{
    const q=(url&&url.value||'').trim();
    if(!q){ if(url)url.focus(); return; }
    if(!results)return;
    results.innerHTML='<div class="dl-results-hd">Buscando...</div>';
    sBtn.disabled=true;sBtn.textContent='Buscando...';
    try{
      const r=await window.onda.youtubeSearchList(q);
      if(!r||!r.length){
        results.innerHTML='<div class="dl-results-hd">Sin resultados.</div>';
      }else{
        const cards=r.map(x=>{
          const dur=x.duration?Math.floor(x.duration/60)+':'+('0'+Math.floor(x.duration%60)).slice(-2):'';
          const titleSafe=String(x.title||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
          const chanSafe=String(x.channel||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
          return '<div class="dl-res" data-id="'+x.id+'" data-title="'+titleSafe+'">'
            + '<div class="dl-res-thumb"><img src="'+x.thumb+'" loading="lazy" alt=""><button class="dl-res-prev" data-vid="'+x.id+'" title="Previsualizar">▶</button></div>'
            + '<div class="dl-res-info"><b>'+titleSafe+'</b><span>'+chanSafe+(dur?' · '+dur:'')+'</span></div>'
            + '<button class="dl-res-btn" title="Descargar">⬇ Descargar</button>'
            + '</div>';
        }).join('');
        results.innerHTML='<div class="dl-results-hd">'+r.length+' resultados — pulsa Descargar en el que quieras</div><div class="dl-results-grid">'+cards+'</div>';
      }
    }catch(e){
      results.innerHTML='<div class="dl-results-hd">Error al buscar.</div>';
    }
    sBtn.disabled=false;sBtn.textContent='🔍 Buscar en YouTube';
  };

  if(oBtn)oBtn.onclick=()=>window.onda.download.openFolder(PF);

  if(tabs)tabs.onclick=e=>{
    const b=e.target.closest('[data-dt]'); if(!b)return;
    _dlTab=b.dataset.dt;
    tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    dlRender();
  };

  if(list)list.onclick=async e=>{
    const btn=e.target.closest('[data-act]'); if(!btn)return;
    const row=btn.closest('.dl-row'); if(!row)return;
    const id=row.dataset.id;
    if(btn.dataset.act==='cancel')await window.onda.download.cancel(id);
    else if(btn.dataset.act==='remove')await window.onda.download.remove(PF,id);
    dlRefresh();
  };

  if(results)results.onclick=async e=>{
    const prevBtn = e.target.closest('.dl-res-prev');
    if (prevBtn) {
      e.stopPropagation();
      const vid = prevBtn.dataset.vid;
      const originalText = prevBtn.textContent;
      prevBtn.textContent = '⏳';
      prevBtn.disabled = true;
      
      let previewContainer = document.getElementById('preview-audio-container');
      if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'preview-audio-container';
        previewContainer.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;background:color-mix(in srgb, var(--acc) 20%, #1a1525);border-radius:16px;padding:12px 16px;box-shadow:0 10px 30px rgba(0,0,0,0.8), 0 0 25px color-mix(in srgb, var(--acc) 40%, transparent);display:flex;align-items:center;gap:12px;max-width:500px;width:90%;border:2px solid var(--acc);backdrop-filter:blur(15px);';
        document.body.appendChild(previewContainer);
      }
      previewContainer.innerHTML = '';
      
      const card = prevBtn.closest('.dl-res');
      const thumbUrl = card ? card.querySelector('img')?.src : '';
      const title = card ? card.querySelector('b')?.textContent : 'Previsualización';
      
      previewContainer.innerHTML = `
        <img src="${thumbUrl}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
          <div style="font-size:11px;color:var(--dim);">Previsualización</div>
        </div>
        <audio id="preview-audio-player" controls style="width:180px;height:32px;"></audio>
        <button id="preview-audio-close" style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;cursor:pointer;flex-shrink:0;">✕</button>
      `;
      
      const audioPlayer = previewContainer.querySelector('#preview-audio-player');
      const closeBtn = previewContainer.querySelector('#preview-audio-close');
      closeBtn.onclick = () => {
        audioPlayer.pause();
        previewContainer.remove();
      };
      
      window.onda.getAudioStream('https://www.youtube.com/watch?v=' + vid).then(r => {
        if (r && r.streamUrl) {
          audioPlayer.src = r.streamUrl;
          audioPlayer.play().catch(() => {});
          prevBtn.textContent = '⏹';
        } else {
          window.showAlert('No se pudo preescuchar: ' + (r.error || 'error desconocido'));
          prevBtn.textContent = originalText;
        }
        prevBtn.disabled = false;
      }).catch(err => {
        window.showAlert('Error: ' + (err.message || err));
        prevBtn.textContent = originalText;
        prevBtn.disabled = false;
      });
      return;
    }

    const btn=e.target.closest('.dl-res-btn'); if(!btn)return;
    const card=btn.closest('.dl-res'); if(!card)return;
    const id=card.dataset.id; const t=card.dataset.title||'';
    const url2='https://www.youtube.com/watch?v='+id;
    
    // Preguntar si incluir portada
    const includeCover = await window.showConfirm('¿Incluir la portada en el archivo MP3?');
    btn.disabled=true;btn.textContent='…';
    try{
      const r=await window.onda.download.start(url2,PF,t,includeCover);
      if(r&&r.error){ window.showAlert('Error: '+r.error); btn.disabled=false;btn.textContent='⬇ Descargar'; }
      else if(r&&r.duplicated){ window.showAlert('Ya se está descargando esa canción'); btn.disabled=false;btn.textContent='⬇ Descargar'; }
      else{ btn.textContent='✓ En cola'; if(url)url.value=''; await dlRefresh(); }
    }catch(err){ window.showAlert('Error: '+(err&&err.message||err)); btn.disabled=false;btn.textContent='⬇ Descargar'; }
  };

  if(!_dlBound){
    _dlBound=true;
    if(window.onda&&window.onda.on){
      window.onda.on('download:progress',()=>{ if(view==='downloads')dlRefresh(); });
    }
  }
}