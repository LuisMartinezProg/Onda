/* Reproduccion: playAt, cola, siguiente/anterior, teclas, MediaSession */
/* ---- Reproducción ---- */
async function playAt(i,doFade){if(i<0||i>=q.length)return;const dur=(doFade&&S.fade)?S.fade:0;init();const wf=dur>0&&ctx&&A.src&&!A.paused;if(wf){const g=N.fade.gain;g.cancelScheduledValues(ctx.currentTime);g.setValueAtTime(g.value,ctx.currentTime);g.linearRampToValueAtTime(0,ctx.currentTime+dur);await new Promise(r=>setTimeout(r,dur*1000+20))}ci=i;const t=q[i];try{const f=t.u||await file(t);if(t.u)A.src=t.u;else{URL.revokeObjectURL(A.src);A.src=URL.createObjectURL(f)}init();ctx.resume();if(wf&&N.fade){const g=N.fade.gain;g.cancelScheduledValues(ctx.currentTime);g.setValueAtTime(0,ctx.currentTime);g.linearRampToValueAtTime(1,ctx.currentTime+dur)}else if(N.fade){N.fade.gain.cancelScheduledValues(ctx.currentTime);N.fade.gain.setValueAtTime(1,ctx.currentTime)}await A.play();info(t,f)}catch(e){$('#st').textContent='No se pudo abrir: '+t.t}mark()}
async function info(t,f){$('#bt').textContent=t.t;$('#ba').textContent=t.a+' — '+t.al;document.title=t.t+' · Onda';
 $('#nw').classList.remove('sh');
 const g=(t.u&&window.onda)?await onda.tags(PF,t.p[0]):await tags(f);let u='';if(g.picture)u=URL.createObjectURL(new Blob([new Uint8Array(g.picture.data)],{type:g.picture.format}));
 if(t.cv)u=t.cv;document.body.style.setProperty('--cv',u?'url("'+u+'")':'none'); if(u && window.extractColor) { 
  window.extractColor(u); 
} else {
  // Si no hay portada, borramos el color de la canción anterior para que vuelva al color del banner
  document.documentElement.style.removeProperty('--song-acc');
  document.documentElement.style.removeProperty('--song-acc2');
} if('mediaSession'in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:t.t,artist:t.a,album:t.al,artwork:u?[{src:u}]:[]})
 requestAnimationFrame(()=>$('#nw').classList.add('sh'));loadLyr(t,f);
 if(S.eqauto){S.eq=PRE[guessPre(t)].slice();saveS();fx()}
 ibar()}
const next=a=>{if(!q.length)return;if(a===1&&rep==2)return playAt(ci);let n;if(a===0){n=ci+1;if(n>=q.length)n=0;}else{n=shuf?Math.floor(Math.random()*q.length):ci+1;if(n>=q.length){if(rep==1)n=0;else return;}}playAt(n,true)},
 prev=()=>A.currentTime>3?A.currentTime=0:playAt(ci>0?ci-1:q.length-1,true),tog=()=>A.src&&(A.paused?(init(),ctx.resume(),A.play()):A.pause());
A.onended=()=>next(1);
A.onplay=A.onpause=()=>{const p=A.paused;if(window.onda&&window.onda.playerState)window.onda.playerState(!p);document.body.classList.toggle('pause',p);$('#pp').innerHTML=p?`<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`:`<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>`;if('mediaSession'in navigator)navigator.mediaSession.playbackState=p?'paused':'playing'};
A.ontimeupdate=()=>{if(document.hidden)return;if(_lyr.length){renderLyr(A.currentTime);if(_karaActive)renderKaraoke();syncKaraBar()}$('#cu').textContent=fmt(A.currentTime);$('#du').textContent=fmt(A.duration);if(!sk.dragging)$('#sk').value=A.duration?A.currentTime/A.duration*1000:0};
const sk=$('#sk');sk.oninput=()=>{sk.dragging=1;A.currentTime=sk.value/1000*A.duration;sk.dragging=0};
$('#pp').onclick=tog;$('#nx').onclick=()=>next(0);$('#pv').onclick=prev;$('#vo').oninput=e=>A.volume=e.target.value;
$('#sh').onclick=e=>e.currentTarget.classList.toggle('on',shuf=!shuf);$('#rp').onclick=e=>{rep=(rep+1)%3;e.currentTarget.classList.toggle('on',rep>0);e.currentTarget.innerHTML=rep==2?`<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>`:`<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`};
if('mediaSession'in navigator){const m=navigator.mediaSession;m.setActionHandler('play',tog);m.setActionHandler('pause',tog);m.setActionHandler('previoustrack',prev);m.setActionHandler('nexttrack',()=>next(0));m.setActionHandler('seekto',e=>A.currentTime=e.seekTime)}
addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey)return;if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.code=='Space'){e.preventDefault();tog()}if(e.code=='ArrowRight')A.currentTime+=5;if(e.code=='ArrowLeft')A.currentTime-=5});

window.extractColor = function(src) {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = function() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 50; canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);
    try {
      const data = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i+3] > 128) {
          const bright = (data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000;
          if (bright > 30 && bright < 230) {
            r += data[i]; g += data[i+1]; b += data[i+2]; count++;
          }
        }
      }
      if (count > 0) {
        r = Math.floor(r / count); g = Math.floor(g / count); b = Math.floor(b / count);
        document.documentElement.style.setProperty('--song-acc', 'rgb(' + r + ', ' + g + ', ' + b + ')');
        document.documentElement.style.setProperty('--song-acc2', 'rgb(' + Math.min(r+50, 255) + ', ' + Math.min(g+50, 255) + ', ' + Math.min(b+50, 255) + ')');
      }
    } catch(e) {}
  };
  img.src = src;
};