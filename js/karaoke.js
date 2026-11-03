/* Karaoke: modulo unico (reemplaza los parches kara-01 ... kara-09).
   - Sin MutationObserver ni setInterval: se engancha a initKaraView() y a eventos del audio.
   - Un solo manejador para cada cosa (antes el hover se enlazaba 4 veces).
   Depende de globales de app.js: lib, q, ci, A, playAt, tog, prev, next, initKaraView. */
(function(){
  if(window.__karaokeModule)return;window.__karaokeModule=1;

  var SVG={
    pv:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
    nx:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M6 18l8.5-6L6 6zm9-12v12h2V6z"/></svg>',
    play:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>'
  };
  var MSG='position:absolute;inset:0;display:grid;place-items:center;color:var(--dim);font-size:13px;background:#000';

  /* ---------- Vista previa al pasar el mouse por la lista ---------- */
  var hoverTimer=0;
  function ensurePreview(){
    var km=document.querySelector('#kara .kmain');
    if(!km)return null;
    var pr=document.getElementById('k-preview');
    if(!pr){pr=document.createElement('div');pr.id='k-preview';km.appendChild(pr)}
    else if(pr.parentElement!==km){km.appendChild(pr)}
    return pr;
  }
  document.addEventListener('mouseover',function(e){
    var row=e.target.closest&&e.target.closest('#k-list .krow');if(!row)return;
    var t=(typeof lib!=='undefined')&&lib.find(function(x){return x.id===row.dataset.id});if(!t)return;
    var pr=ensurePreview();if(!pr)return;
    clearTimeout(hoverTimer);
    var html=t.cv
      ?'<div class="kp-cv" style="background-image:url(\''+t.cv+'\')"></div>'
      :'<div class="kp-cv kp-ph">'+((t.t&&t.t[0])||'♪').toUpperCase()+'</div>';
    pr.innerHTML=html+'<div class="kp-title">'+(t.t||'')+'</div><div class="kp-artist">'+(t.a||'')+'</div>';
    requestAnimationFrame(function(){pr.classList.add('on')});
  });
  document.addEventListener('mouseout',function(e){
    var row=e.target.closest&&e.target.closest('#k-list .krow');if(!row)return;
    var to=e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest('.krow');
    if(to)return;
    var pr=document.getElementById('k-preview');if(!pr)return;
    pr.classList.remove('on');clearTimeout(hoverTimer);
    hoverTimer=setTimeout(function(){if(!pr.classList.contains('on'))pr.innerHTML=''},400);
  });

  /* ---------- Caratula con controles integrados ---------- */
  function updPlayIcon(){
    var p=document.querySelector('#kara .kcov .kcov-ctl .pp');if(!p)return;
    p.innerHTML=(typeof A!=='undefined'&&A.paused)?SVG.play:SVG.pause;
  }
  function bindCov(){
    var cov=document.getElementById('k-cov');
    if(!cov||cov.__cb)return;
    cov.__cb=1;
    if(!cov.querySelector('.kcov-ph')){
      var ph=document.createElement('div');ph.className='kcov-ph';ph.textContent='♪';cov.appendChild(ph);
    }
    if(!cov.querySelector('.kcov-ctl')){
      var bar=document.createElement('div');bar.className='kcov-ctl';
      bar.innerHTML='<button class="pv" aria-label="Anterior">'+SVG.pv+'</button><button class="pp" aria-label="Reproducir/Pausar">'+SVG.pause+'</button><button class="nx" aria-label="Siguiente">'+SVG.nx+'</button>';
      cov.appendChild(bar);
      bar.querySelector('.pv').onclick=function(e){e.stopPropagation();if(typeof prev==='function')prev()};
      bar.querySelector('.nx').onclick=function(e){e.stopPropagation();if(typeof next==='function')next(0)};
      bar.querySelector('.pp').onclick=function(e){
        e.stopPropagation();
        if(typeof A!=='undefined'&&!A.src&&typeof q!=='undefined'&&q.length&&typeof playAt==='function'){playAt(0,false)}
        else if(typeof tog==='function'){tog()}
      };
    }
    updPlayIcon();
  }
  if(typeof A!=='undefined'){A.addEventListener('play',updPlayIcon);A.addEventListener('pause',updPlayIcon)}

  /* ---------- Video de referencia (busqueda en YouTube) ---------- */
  function ensureVideoUI(){
    var km=document.querySelector('#kara .kmain');if(!km)return;
    if(!document.getElementById('k-video-sheet')){
      var sh=document.createElement('div');sh.id='k-video-sheet';
      sh.innerHTML='<div id="k-video-holder"></div>';km.appendChild(sh);
    }
    if(!document.getElementById('k-searchbar')){
      var sb=document.createElement('div');sb.id='k-searchbar';
      sb.innerHTML='<button id="k-search-btn">🔍 Buscar canción original</button>';km.appendChild(sb);
    }
  }
  function closeVideo(){
    var sh=document.getElementById('k-video-sheet');if(!sh)return;
    sh.classList.remove('on');var kk=document.getElementById('kara');if(kk)kk.classList.remove('vid-on');
    setTimeout(function(){var h=document.getElementById('k-video-holder');if(h)h.innerHTML=''},420);
  }
  function muteWv(wv){
    try{wv.executeJavaScript('(function(){var v=document.querySelector("video");if(v){v.muted=true;v.volume=0;v.setAttribute("muted","")}})()')}catch(e){}
  }
  function doSearch(){
    var t=(typeof q!=='undefined'&&typeof ci!=='undefined'&&q[ci])?q[ci]:null;
    if(!t){window.showAlert('Elige una canción primero');return}
    if(!navigator.onLine){window.showAlert('Sin conexión');return}
    var btn=document.getElementById('k-search-btn');
    var holder=document.getElementById('k-video-holder');
    var sheet=document.getElementById('k-video-sheet');
    if(!btn||!holder||!sheet)return;
    var query=(t.t||'')+' '+(t.a||'')+' original karaoke';
    var oldText=btn.textContent;
    btn.disabled=true;btn.textContent='Buscando...';
    holder.innerHTML='<div style="'+MSG+'">Buscando...</div>';
    sheet.classList.add('on');var kk=document.getElementById('kara');if(kk)kk.classList.add('vid-on');
    setTimeout(function(){var b=document.getElementById('k-body');if(b){var n=b.querySelector('.kln.now');if(n)n.scrollIntoView({block:'center',behavior:'smooth'})}},80);
    setTimeout(keepNowVisible,150);
    function restore(){btn.disabled=false;btn.textContent=oldText}
    if(!window.onda||!window.onda.youtubeSearch){
      holder.innerHTML='<div style="'+MSG+';padding:20px;text-align:center">Búsqueda no disponible</div>';
      restore();return;
    }
    window.onda.youtubeSearch(query).then(function(r){
      if(r&&r.videoId){
        holder.innerHTML='<button class="kv-close" title="Cerrar">✕</button><webview src="https://www.youtube.com/watch?v='+r.videoId+'&autoplay=1&mute=1" useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" httpreferrer="https://www.youtube.com/" style="position:absolute;inset:0;width:100%;height:100%;border:0"></webview>';
        var wv=holder.querySelector('webview');
        if(wv){
          wv.addEventListener('dom-ready',function(){muteWv(wv)});
          wv.addEventListener('did-navigate',function(){muteWv(wv)});
          wv.addEventListener('did-frame-finish-load',function(){muteWv(wv)});
          setTimeout(function(){muteWv(wv)},1500);
          setTimeout(function(){muteWv(wv)},3500);
          setTimeout(function(){muteWv(wv)},6500);
        }
        var cb=holder.querySelector('.kv-close');
        if(cb)cb.onclick=function(e){e.stopPropagation();closeVideo()};
      }else{
        holder.innerHTML='<div style="'+MSG+';padding:20px;text-align:center">No se encontró el video</div>';
      }
      restore();
    }).catch(function(){
      holder.innerHTML='<div style="'+MSG+'">Error al buscar</div>';
      restore();
    });
  }
  document.addEventListener('click',function(e){
    if(e.target.closest('#k-search-btn')){doSearch();return}
    if(e.target.closest('#kara .kv-close')){closeVideo();return}
    if(e.target.closest('#k-exit')){closeVideo();return}
  },true);

  /* ---------- Con el video abierto, mantiene la linea actual a la vista ---------- */
  var lastNow=null;
  function keepNowVisible(){
    var kara=document.getElementById('kara');
    if(!kara||!kara.classList.contains('vid-on'))return;
    var body=document.getElementById('k-body');if(!body)return;
    var now=body.querySelector('.kln.now');
    if(!now||now===lastNow)return;
    lastNow=now;
    requestAnimationFrame(function(){
      var r=now.getBoundingClientRect();
      if(r.bottom>window.innerHeight-420)now.scrollIntoView({block:'center',behavior:'smooth'});
    });
  }
  if(typeof A!=='undefined')A.addEventListener('timeupdate',keepNowVisible);

  /* ---------- Enganche: se ejecuta cada vez que app.js arma la vista Karaoke ---------- */
  function setup(){
    try{ensurePreview();bindCov();ensureVideoUI()}catch(err){console.error('[karaoke]',err)}
  }
  if(typeof window.initKaraView==='function'){
    var _init=window.initKaraView;
    window.initKaraView=function(){var r=_init.apply(this,arguments);setup();return r};
  }

  /* ---------- Buscador de Karaoke (Delegación de eventos) ---------- */
  document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'k-search') {
      var val = e.target.value.toLowerCase();
      var rows = document.querySelectorAll('#k-list .krow');
      rows.forEach(function(r) {
        var id = r.dataset.id;
        var t = (typeof lib !== 'undefined') && lib.find(function(x) { return String(x.id) === String(id); });
        if (t) {
          var match = (t.t + ' ' + t.a).toLowerCase().indexOf(val) !== -1;
          r.style.display = match ? '' : 'none';
        }
      });
      if (val.trim() !== '') {
        var kl = document.getElementById('k-list');
        if (kl) kl.classList.remove('hide');
        var ext = document.getElementById('k-ext');
        if (ext) ext.querySelector('span').textContent = '▼ Canciones';
      }
    }
  });
  /* --------------------------------------------------------------- */

  setup();
})();
