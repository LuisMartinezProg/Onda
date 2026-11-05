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
    const sub=esc((x.file||url).split(/[\\\/]/).pop()) + ' · MP3';
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

function askCover() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);';
    const box = document.createElement('div');
    box.style.cssText = 'background:#1a1525;border:1px solid var(--acc);padding:24px;border-radius:16px;display:flex;flex-direction:column;gap:12px;width:320px;box-shadow:0 10px 40px rgba(0,0,0,0.8);';
    box.innerHTML = `
      <h3 style="margin:0;font-size:18px;color:#fff;text-align:center;">Descargar MP3</h3>
      <p style="margin:0 0 10px 0;font-size:13px;color:#aaa;text-align:center;">¿Deseas incluir la portada del video en el archivo?</p>
      <button id="btn-cover" style="background:var(--acc);color:#000;border:none;padding:12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px;">Con portada</button>
      <button id="btn-nocc" style="background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:12px;border-radius:8px;cursor:pointer;font-size:14px;">Sin portada</button>
      <button id="btn-cancel" style="background:transparent;color:#ff8a8a;border:none;padding:10px;cursor:pointer;font-size:13px;margin-top:4px;">Cancelar</button>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    box.querySelector('#btn-cover').onclick = () => { overlay.remove(); resolve('cover'); };
    box.querySelector('#btn-nocc').onclick = () => { overlay.remove(); resolve('nocc'); };
    box.querySelector('#btn-cancel').onclick = () => { overlay.remove(); resolve('cancel'); };
  });
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
    
    <div class="dl-base-panel">
      <h3 class="dl-base-title">HISTORIAL DE DESCARGAS</h3>
      <div class="dl-tabs">
        <button data-dt="all" class="${_dlTab==='all'?'on':''}">Todo</button>
        <button data-dt="done" class="${_dlTab==='done'?'on':''}">Descargados</button>
        <button data-dt="running" class="${_dlTab==='running'?'on':''}">En proceso</button>
        <button data-dt="cancel" class="${_dlTab==='cancel'?'on':''}">Canceladas</button>
      </div>
      <div id="dl-list"><p style="color:var(--dim);text-align:center;padding:40px 20px">Cargando...</p></div>
    </div>`;
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

  if(url)url.onkeydown=e=>{ 
    if(e.key==='Enter'){
      const q = url.value.trim();
      const isUrl = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/i.test(q);
      if (isUrl) {
        if (go) go.click();
      } else {
        if (sBtn) sBtn.click();
      }
    } 
  };

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
      
      // 1. Cerrar cualquier reproductor anterior que esté sonando
      const oldContainer = document.getElementById('preview-audio-container');
      if (oldContainer) {
        const oldAudio = oldContainer.querySelector('audio');
        if (oldAudio) {
          oldAudio.pause();
          oldAudio.src = '';
        }
        oldContainer.remove();
      }
      
      // 2. Restaurar todos los botones de la cuadrícula
      document.querySelectorAll('.dl-res-prev').forEach(b => { 
        b.innerHTML = '▶'; 
        b.classList.remove('loading'); 
        b.disabled = false; 
      });

      // 3. Poner el botón actual en "Espera..."
      prevBtn.innerHTML = '<div class="dl-spinner" style="margin-right:6px;"></div> Espera...';
      prevBtn.classList.add('loading');
      prevBtn.disabled = true;
      
      const card = prevBtn.closest('.dl-res');
      const thumbUrl = card ? card.querySelector('img')?.src : '';
      const title = card ? card.querySelector('b')?.textContent : 'Previsualización';

      // 4. Crear el reproductor flotante INMEDIATAMENTE en modo "Esperando..."
      const previewContainer = document.createElement('div');
      previewContainer.id = 'preview-audio-container';
      previewContainer.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(15, 12, 25, 0.95);border-radius:20px;padding:16px 20px;box-shadow:0 10px 40px rgba(0,0,0,0.9), 0 0 30px color-mix(in srgb, var(--acc) 30%, transparent);display:flex;align-items:center;gap:16px;max-width:550px;width:90%;border:1px solid color-mix(in srgb, var(--acc) 40%, transparent);backdrop-filter:blur(20px);';
      
      previewContainer.innerHTML = `
        <img src="${thumbUrl}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.5);flex-shrink:0;">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <div style="font-size:14px;font-weight:700;color:#fff;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
            <button id="preview-audio-close" style="background:transparent;border:none;color:#888;cursor:pointer;font-size:18px;padding:0;line-height:1;transition:color 0.2s;">✕</button>
          </div>
          
          <div id="preview-status" style="font-size:12px;color:var(--acc);display:flex;align-items:center;gap:6px;">
            <div class="dl-spinner" style="width:12px;height:12px;border-width:1.5px;"></div> Esperando a YouTube...
          </div>
          
          <div id="custom-audio-ui" style="display:none;align-items:center;gap:12px;width:100%;">
            <button id="custom-play-btn" style="background:var(--acc);color:#000;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;transition:transform 0.2s;">⏸</button>
            <div id="custom-progress" style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:10px;cursor:pointer;position:relative;">
              <div id="custom-progress-fill" style="width:0%;height:100%;background:var(--acc);border-radius:10px;transition:width 0.1s linear;box-shadow:0 0 10px var(--acc);"></div>
            </div>
            <span id="custom-time" style="font-size:11px;color:#aaa;min-width:75px;text-align:right;font-variant-numeric:tabular-nums;">--:-- / --:--</span>
          </div>
        </div>
        <audio id="preview-audio-player" style="display:none;"></audio>
      `;
      document.body.appendChild(previewContainer);

      const audioPlayer = previewContainer.querySelector('#preview-audio-player');
      const closeBtn = previewContainer.querySelector('#preview-audio-close');
      const playBtn = previewContainer.querySelector('#custom-play-btn');
      const progressBar = previewContainer.querySelector('#custom-progress');
      const progressFill = previewContainer.querySelector('#custom-progress-fill');
      const timeDisplay = previewContainer.querySelector('#custom-time');
      const statusText = previewContainer.querySelector('#preview-status');
      const audioUI = previewContainer.querySelector('#custom-audio-ui');

      const cleanup = () => {
        audioPlayer.pause();
        previewContainer.remove();
        document.querySelectorAll('.dl-res-prev').forEach(b => { 
          b.innerHTML = '▶'; 
          b.classList.remove('loading'); 
          b.disabled=false; 
        });
      };

      closeBtn.onmouseover = () => closeBtn.style.color = '#ff8a8a';
      closeBtn.onmouseout = () => closeBtn.style.color = '#888';
      closeBtn.onclick = cleanup;

      playBtn.onclick = () => {
        if (audioPlayer.paused) {
          audioPlayer.play();
          playBtn.textContent = '⏸';
        } else {
          audioPlayer.pause();
          playBtn.textContent = '▶';
        }
      };

      const formatTime = (secs) => {
        if (isNaN(secs) || secs === Infinity || secs === 0) return '--:--';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
      };

      const updateTimeDisplay = () => {
        if (audioPlayer.duration && !isNaN(audioPlayer.duration) && audioPlayer.duration !== Infinity) {
          timeDisplay.textContent = `${formatTime(audioPlayer.currentTime)} / ${formatTime(audioPlayer.duration)}`;
        } else {
          timeDisplay.textContent = `${formatTime(audioPlayer.currentTime)} / --:--`;
        }
      };

      // Se ejecuta en cuanto el navegador detecta la duración real del audio
      audioPlayer.onloadedmetadata = () => {
        updateTimeDisplay();
      };

      audioPlayer.ontimeupdate = () => {
        updateTimeDisplay();
        if (audioPlayer.duration && !isNaN(audioPlayer.duration) && audioPlayer.duration !== Infinity) {
          const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
          progressFill.style.width = pct + '%';
        }
      };

      audioPlayer.onended = () => {
        playBtn.textContent = '▶';
        progressFill.style.width = '0%';
        // Al terminar, mostramos 0:00 con la duración total correcta
        if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
           timeDisplay.textContent = `0:00 / ${formatTime(audioPlayer.duration)}`;
        } else {
           timeDisplay.textContent = '--:-- / --:--';
        }
      };

      progressBar.onclick = (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = pos * audioPlayer.duration;
      };

      // 5. Pedir el enlace usando ytdl-core (más rápido y confiable)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('YouTube está tardando demasiado. Intenta de nuevo.')), 10000));
      
      Promise.race([
        window.onda.getAudioStream('https://www.youtube.com/watch?v=' + vid),
        timeoutPromise
      ]).then(result => {
        if (!result || result.error || !result.streamUrl) {
          throw new Error(result && result.error ? result.error : 'No se obtuvo el enlace de audio');
        }
        
        // Cuando llega la URL, ocultamos el "Esperando..." y mostramos los controles
        statusText.style.display = 'none';
        audioUI.style.display = 'flex';
        audioPlayer.src = result.streamUrl;
        audioPlayer.play().catch(() => {});
        playBtn.textContent = '⏸';
        
        // Restaurar el botón de la tarjeta
        document.querySelectorAll('.dl-res-prev').forEach(b => { 
          b.innerHTML = '▶'; 
          b.classList.remove('loading'); 
          b.disabled=false; 
        });
      }).catch(err => {
        window.showAlert('No se pudo cargar la canción: ' + (err.message || err));
        cleanup();
      });
      return;
    }

    const btn=e.target.closest('.dl-res-btn'); if(!btn)return;
    const card=btn.closest('.dl-res'); if(!card)return;
    const id=card.dataset.id; const t=card.dataset.title||'';
    const url2='https://www.youtube.com/watch?v='+id;
    
    const choice = await askCover();
    if (choice === 'cancel') return;
    const includeCover = (choice === 'cover');
    
    btn.disabled=true;btn.textContent='⏳...';
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