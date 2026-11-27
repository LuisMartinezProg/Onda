/* Splash dorado: se ve mientras carga y se desvanece solo.
   El bloque #splash vive en index.html; aquí solo se oculta y se quita. */
(function () {
  const el = document.getElementById('splash');
  if (!el) return;
  const MINIMO = 1800;  // ms mínimos visibles (contados desde que abrió la página)
  const MAXIMO = 9000;  // por si algo tarda: nunca se queda pegado
  let hecho = false;
  function quitar() {
    if (hecho) return;
    hecho = true;
    el.classList.add('fuera');
    setTimeout(function () { try { el.remove(); } catch (e) {} }, 700);
  }
  function listo() { setTimeout(quitar, Math.max(0, MINIMO - performance.now())); }
  if (document.readyState === 'complete') listo();
  else window.addEventListener('load', listo, { once: true });
  setTimeout(quitar, MAXIMO);
})();