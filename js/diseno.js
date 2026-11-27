/* Diseño base: relleno dorado de las barras deslizantes y transición suave al cambiar de sección. */
(() => {
  if (window.__ondaDiseno) return;
  window.__ondaDiseno = 1;

  // Todas las barras, menos los deslizadores verticales del ecualizador (data-e), que tienen su propio estilo
  const SEL = 'input[type=range]:not([data-e])';

  // Calcula qué porcentaje de la barra está recorrido y lo deja en --p para que el CSS lo pinte
  function pinta(el) {
    try {
      const mn = parseFloat(el.min);
      const min = isFinite(mn) ? mn : 0;
      const mx = parseFloat(el.max);
      const max = isFinite(mx) && mx > min ? mx : min + 1;
      const p = ((parseFloat(el.value) - min) / (max - min)) * 100;
      el.style.setProperty('--p', Math.max(0, Math.min(100, isFinite(p) ? p : 0)) + '%');
    } catch (e) { console.error('[diseno] no se pudo pintar la barra', e); }
  }

  function prepara() {
    try {
      document.querySelectorAll(SEL).forEach(el => { el.classList.add('onda-rng'); pinta(el); });
    } catch (e) { console.error('[diseno] no se pudieron preparar las barras', e); }
  }

  // Al mover una barra con el mouse o el teclado
  document.addEventListener('input', e => {
    const t = e.target;
    if (t && t.matches && t.matches(SEL)) pinta(t);
  }, true);

  // Las pantallas se redibujan solas: cuando cambian, se preparan las barras nuevas
  let espera = 0;
  const programa = () => { clearTimeout(espera); espera = setTimeout(prepara, 50); };

  // La barra de canción y la de volumen las mueve la app sin evento "input": se siguen desde el audio
  function sigueAudio() {
    if (document.hidden) return;
    ['sk', 'vo'].forEach(id => { const el = document.getElementById(id); if (el) pinta(el); });
  }

  // Desvanecido suave al tocar una sección del menú lateral
  document.addEventListener('click', e => {
    try {
      const b = e.target.closest && e.target.closest('#nav button[data-v]');
      const v = document.getElementById('v');
      if (!b || !v) return;
      v.classList.remove('v-in');
      void v.offsetWidth; // reinicia la animación
      v.classList.add('v-in');
    } catch (err) { console.error('[diseno] transición de sección', err); }
  }, true);

  function inicia() {
    const v = document.getElementById('v');
    if (v && window.MutationObserver) new MutationObserver(programa).observe(v, { childList: true, subtree: true });
    if (typeof A !== 'undefined' && A && A.addEventListener) {
      ['timeupdate', 'loadedmetadata', 'durationchange', 'emptied', 'seeked', 'volumechange']
        .forEach(ev => A.addEventListener(ev, sigueAudio));
    }
    prepara();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
})();