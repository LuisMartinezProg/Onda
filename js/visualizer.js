
// Crear el div del brillo si no existe
if (!document.getElementById('edge-glow')) {
  const g = document.createElement('div');
  g.id = 'edge-glow';
  document.body.appendChild(g);
}

// Escuchar el cambio en el checkbox de ajustes
document.addEventListener('change', (e) => {
  if (e.target.dataset && e.target.dataset.k === 'edgeFx') {
    document.body.classList.toggle('edge-fx', e.target.checked);
  }
});

// Reactividad al audio
let _beatInterval = null;
window.startEdgeBeat = function(analyser) {
  if (_beatInterval) clearInterval(_beatInterval);
  _beatInterval = setInterval(() => {
    if (!document.body.classList.contains('edge-fx') || !analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    // Tomar solo los graves (primeros 10 valores) para un pulso profundo
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += data[i];
    let avg = sum / 10;
    document.documentElement.style.setProperty('--beat', (avg / 255).toFixed(2));
  }, 50);
};

/* Visualizador del panel derecho */
/* ---- Visualizador ---- */
const vz=$('#vz'),vc=vz.getContext('2d');let raf=0;
function draw(){raf=0;if(document.hidden||S.eco||!ctx||A.paused)return;const d=new Uint8Array(N.an.frequencyBinCount);N.an.getByteFrequencyData(d);

 // === NUEVO: Pulso del borde reactivo ===
 let sum=0;for(let i=0;i<10;i++)sum+=d[i];document.documentElement.style.setProperty('--beat',((sum/10)/255).toFixed(2));

 vc.clearRect(0,0,vz.width,vz.height);
 const c=getComputedStyle(document.documentElement).getPropertyValue('--acc'),W=vz.width,H=vz.height,w=W/32;vc.fillStyle=c;for(let i=0;i<32;i++){const h=Math.max(2,d[i+2]/255*(H-4));vc.beginPath();vc.roundRect(i*w+2,H-h,w-4,h,3);vc.fill()}raf=requestAnimationFrame(draw)}
const kick=()=>{if(!raf)raf=requestAnimationFrame(draw)};A.addEventListener('play',kick);document.addEventListener('visibilitychange',kick);
$('#nw').onclick=kick;
