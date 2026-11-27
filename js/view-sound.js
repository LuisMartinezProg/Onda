/* Vista: Sonido. Izquierda: ecualizador y medidor de decibeles. Derecha: opciones con barras. */
const SND = [
  ['wid', 'Sonido amplio', 0, 2.5, .05, v => (+v).toFixed(2) + '×', 'Abre el estéreo'],
  ['bass', 'Refuerzo de graves', 0, 12, .5, v => v + ' dB', 'Más cuerpo en los bajos'],
  ['norm', 'Normalizar volumen', 0, 1, .05, v => Math.round(v * 100) + '%', 'Iguala lo fuerte y lo suave'],
  ['fade', 'Fundido entre canciones', 0, 8, .5, v => v + ' s', 'Cuánto dura el cambio'],
  ['pre', 'Preamplificación', .3, 1.5, .05, v => (+v).toFixed(2) + '×', 'Volumen antes de los efectos']
];
const sndHz = f => f >= 1000 ? (f / 1000) + 'k' : String(f);
const sndPct = (v, mn, mx) => Math.max(0, Math.min(100, (v - mn) / (mx - mn) * 100)).toFixed(1) + '%';

function viewSound(v) {
  v.innerHTML = '<h2>Sonido</h2><div class="snd" id="snd">'
    + '<section class="snd-card"><h3>Ecualizador</h3>'
    + '<div class="pre">' + Object.keys(PRE).map(k => '<button class="chip" data-p="' + esc(k) + '">' + esc(k) + '</button>').join('') + '</div>'
    + '<div class="eq">' + FQ.map((f, i) => '<label><input type="range" min="-12" max="12" step=".5" value="' + S.eq[i] + '" data-e="' + i + '" aria-label="' + f + ' Hz">' + sndHz(f) + '</label>').join('') + '</div>'
    + '<div class="snd-meter"><div class="mh"><span>Nivel de sonido</span><b id="snd-db">—</b></div><div class="mb"><i id="snd-m"></i><u id="snd-pk"></u></div><div class="ms"><span>-60</span><span>-40</span><span>-20</span><span>0 dB</span></div></div>'
    + '</section>'
    + '<section class="snd-card"><h3>Efectos</h3>' + SND.map(o => {
      const val = S[o[0]] == null ? o[2] : S[o[0]];
      return '<div class="snd-row"><div class="sl"><b>' + o[1] + '</b><small>' + o[6] + '</small></div><input type="range" class="onda-rng" min="' + o[2] + '" max="' + o[3] + '" step="' + o[4] + '" value="' + val + '" data-k="' + o[0] + '" style="--p:' + sndPct(val, o[2], o[3]) + '" aria-label="' + o[1] + '"><span class="sv">' + o[5](val) + '</span></div>';
    }).join('') + '</section></div>';
  const box = document.getElementById('snd');
  box.addEventListener('input', e => {
    const t = e.target, d = t.dataset;
    if (d.e == null && d.k == null) return;
    e.stopPropagation(); // la pantalla no se redibuja ni salta al mover una barra
    if (d.e != null) S.eq[d.e] = +t.value;
    else { S[d.k] = +t.value; const o = SND.find(x => x[0] === d.k), s = t.nextElementSibling; if (o && s) s.textContent = o[5](+t.value); }
    saveS(); fx();
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    e.stopPropagation();
    S.eq = PRE[b.dataset.p].slice(); saveS(); fx();
    box.querySelectorAll('[data-e]').forEach((el, i) => { el.value = S.eq[i]; });
  });
  sndMedidor();
}

/* Medidor de decibeles en vivo (del audio que suena, después de los efectos) */
function sndMedidor() {
  let pico = -60, tPico = 0;
  const buf = new Float32Array(1024);
  const paso = () => {
    const bar = document.getElementById('snd-m'), num = document.getElementById('snd-db'), pk = document.getElementById('snd-pk');
    if (!bar || view !== 'sound') return; // sale de la pantalla: se detiene solo
    if (!document.hidden) {
      let db = -60;
      if (ctx && N.meter && !A.paused) {
        N.meter.getFloatTimeDomainData(buf);
        let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        db = Math.max(-60, 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-9));
      }
      const now = performance.now();
      if (db >= pico) { pico = db; tPico = now; } else if (now - tPico > 800) pico = Math.max(db, pico - 1.5);
      bar.style.width = ((db + 60) / 60 * 100).toFixed(1) + '%';
      pk.style.left = ((pico + 60) / 60 * 100).toFixed(1) + '%';
      num.textContent = db <= -59.5 ? '—' : Math.round(db) + ' dB';
      bar.classList.toggle('hot', db > -6);
    }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}