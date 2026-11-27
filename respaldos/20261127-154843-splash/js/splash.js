/* Splash dorado: se ve solo una vez por apertura de Onda (no en las recargas)
   y se desvanece solo. El bloque #splash vive en index.html. */
(function () {
  const el = document.getElementById('splash');
  if (!el) return;
  let visto = false;
  try { visto = sessionStorage.getItem('onda-splash') === '1'; } catch (e) {}
  if (visto) { try { el.remove(); } catch (e) {} return; }
  try { sessionStorage.setItem('onda-splash', '1'); } catch (e) {}
  const MINIMO = 1800;  // ms mínimos visibles
  const MAXIMO = 5000;  // nunca se queda pegado
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