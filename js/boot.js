/* Inicio de la app y salida del karaoke */
window.applyFont = function(fontName) {
  const fonts = {
    'segoe': "'Segoe UI', Arial, sans-serif",
    'bahnschrift': "'Bahnschrift', 'Segoe UI', sans-serif",
    'century': "'Century Gothic', 'Trebuchet MS', sans-serif",
    'trebuchet': "'Trebuchet MS', Arial, sans-serif",
    'palatino': "'Palatino Linotype', Georgia, serif",
    'impact': "'Impact', 'Arial Black', sans-serif",
    'script': "'Segoe Script', 'Comic Sans MS', cursive",
    'consolas': "'Consolas', 'Courier New', monospace"
  };
  const f = fonts[fontName] || fonts['segoe'];
  document.documentElement.style.setProperty('--ft', f);
  let styleTag = document.getElementById('dynamic-font-style');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'dynamic-font-style';
    document.head.appendChild(styleTag);
  }
  styleTag.innerHTML = 'body, button, input, select, textarea, h1, h2, h3, h4, p, a, span, div, b, strong, .side button, .top input, .top select { font-family: ' + f + ' !important; }';
};

(async()=>{
  if(!sessionStorage.getItem('onda.picked')){
    sessionStorage.setItem('onda.picked','1');
    if(typeof showPicker === 'function') showPicker();
    return;
  }
  if(typeof theme === 'function') theme();
  if(typeof ibar === 'function') ibar();
  const pfl = document.querySelector('#pfl');
  if(pfl) pfl.textContent='Perfil: '+(PFS.find(p=>p.id==PF)||PFS[0]).name;
  lib=(await kv('get','lib')||[]);
  roots=(await kv('get','roots')||[]);
  const st = document.querySelector('#st');
  if(st) st.textContent=lib.length?lib.length+' canciones':'Sin música';
  if(typeof render === 'function') render();
  
  setTimeout(() => {
    window.applyFont(typeof S !== "undefined" && S.font ? S.font : "segoe");
    if (typeof S !== "undefined" && S.edgeFx) {
      document.body.classList.remove('fx-neon', 'fx-soft');
      if (S.edgeFx === 'neon') document.body.classList.add('fx-neon');
      if (S.edgeFx === 'soft') document.body.classList.add('fx-soft');
    }
  }, 100);
})();

document.addEventListener('click',function(e){
  if(!e.target.closest('#k-exit'))return;
  e.preventDefault();e.stopPropagation();
  try{_karaActive=false;_karaSel=null}catch(_){}
  document.body.classList.remove('karaoke-view');
  const _k=document.getElementById('kara');if(_k)_k.remove();
  const _sd=document.querySelector('.side');if(_sd){_sd.style.display='';_sd.style.width='';_sd.style.minWidth='';_sd.style.maxWidth='';_sd.style.padding=''}
  const _ap=document.getElementById('app');if(_ap){_ap.style.gridTemplateColumns=''}
  view='songs';
  document.querySelectorAll('.side [data-v]').forEach(x=>x.classList.toggle('on',x.dataset.v==='songs'));
  if(typeof render === 'function') render();
},true);

// GUARDIA: Si la app intenta mover los botones dentro de la barra, los separa
setInterval(() => {
  const kt = document.querySelector('#kara .ktoggles');
  const kb = document.querySelector('#kara .kbar');
  if (kt && kb && kt.parentElement === kb) {
    kb.parentElement.insertBefore(kt, kb);
  }
}, 500);


// Migración de portadas RÁPIDA (4 trabajadores en paralelo)
async function migrateCovers() {
  if (localStorage.getItem('onda.covers_migrated_v3')) return;
  
  const missing = lib.filter(t => !t.cv);
  if (missing.length === 0) {
    localStorage.setItem('onda.covers_migrated_v3', '1');
    return;
  }
  
  console.log('Iniciando extracción rápida de', missing.length, 'portadas...');
  let i = 0;
  let done = 0;

  const worker = async () => {
    while (i < missing.length) {
      const t = missing[i++];
      try {
        const g = await window.onda.tags(PF, t.p[0]);
        if (g && g.picture) {
          const blob = new Blob([new Uint8Array(g.picture.data)], {type: g.picture.format});
          t.cv = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 300; canvas.height = 300;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, 300, 300);
              resolve(canvas.toDataURL('image/jpeg', 0.85)); // 0.7 de calidad para que sea más rápido
            };
            img.src = URL.createObjectURL(blob);
          });
        }
      } catch(e) {}
      
      done++;
      // Refrescar la pantalla cada 8 portadas para no colapsar el navegador
      if (done % 8 === 0) {
        if (typeof render === 'function') render();
      }
    }
  };

  // Lanzar 4 trabajadores al mismo tiempo
  await Promise.all([worker(), worker(), worker(), worker()]);
  
  if (typeof save === 'function') save();
  if (typeof render === 'function') render();
  localStorage.setItem('onda.covers_migrated_v3', '1');
  console.log('¡Portadas extraídas con éxito!');
}
setTimeout(migrateCovers, 500);

// Migración de portadas RÁPIDA (4 trabajadores en paralelo)
async function migrateCovers() {
  if (localStorage.getItem('onda.covers_migrated_v3')) return;
  
  const missing = lib.filter(t => !t.cv);
  if (missing.length === 0) {
    localStorage.setItem('onda.covers_migrated_v3', '1');
    return;
  }
  
  console.log('Iniciando extracción rápida de', missing.length, 'portadas...');
  let i = 0;
  let done = 0;

  const worker = async () => {
    while (i < missing.length) {
      const t = missing[i++];
      try {
        const g = await window.onda.tags(PF, t.p[0]);
        if (g && g.picture) {
          const blob = new Blob([new Uint8Array(g.picture.data)], {type: g.picture.format});
          t.cv = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 100; canvas.height = 100;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, 100, 100);
              resolve(canvas.toDataURL('image/jpeg', 0.7)); // 0.7 de calidad para que sea más rápido
            };
            img.src = URL.createObjectURL(blob);
          });
        }
      } catch(e) {}
      
      done++;
      // Refrescar la pantalla cada 8 portadas para no colapsar el navegador
      if (done % 8 === 0) {
        if (typeof render === 'function') render();
      }
    }
  };

  // Lanzar 4 trabajadores al mismo tiempo
  await Promise.all([worker(), worker(), worker(), worker()]);
  
  if (typeof save === 'function') save();
  if (typeof render === 'function') render();
  localStorage.setItem('onda.covers_migrated_v3', '1');
  console.log('¡Portadas extraídas con éxito!');
}
setTimeout(migrateCovers, 500);

