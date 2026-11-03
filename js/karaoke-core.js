/* Karaoke: vista, seleccion de cancion, letra sincronizada */
let _karaActive = false;
let _karaSel = null,
  _karaTgl = 'all';

window._karaOriginalHTML = '';

window.filtrarKaraoke = function(val) {
  const lista = document.getElementById('k-list');
  if (!lista) return;
  
  // Si no hemos guardado el HTML original, lo hacemos ahora
  if (!window._karaOriginalHTML) {
    window._karaOriginalHTML = lista.innerHTML;
  }

  const v = String(val).toLowerCase().trim();
  if (v === '') {
    lista.innerHTML = window._karaOriginalHTML;
  } else {
    // Reconstruimos la lista solo con los elementos que coinciden
    const temp = document.createElement('div');
    temp.innerHTML = window._karaOriginalHTML;
    const rows = temp.querySelectorAll('.krow');
    
    let htmlFiltrado = '';
    rows.forEach(r => {
      if (r.textContent.toLowerCase().includes(v)) {
        htmlFiltrado += r.outerHTML;
      }
    });
    
    if (htmlFiltrado === '') {
      lista.innerHTML = '<p style="color:var(--dim);font-size:12px;padding:8px">Sin resultados</p>';
    } else {
      lista.innerHTML = htmlFiltrado;
    }
  }

  // Abrir la lista si hay texto
  if (v !== '') {
    lista.classList.remove('hide');
    const ext = document.getElementById('k-ext');
    if (ext) ext.querySelector('span').textContent = '▼ Canciones';
  }
};

function initKaraView() {
  const kara = document.getElementById('kara');
  if (!kara) return;
  _karaActive = false;
  _karaSel = null;
  kara.classList.remove('active', 'side-open', 'with-vid', 'vid-on');
  kara.classList.toggle('offline', !navigator.onLine);

  const l = document.getElementById('k-list');
  if (l) {
    l.innerHTML =
      lib
        .map(
          t =>
            `<div class="krow${_karaSel === t.id ? ' on' : ''}" data-id="${t.id}"><div class="kth"${t.cv ? ` style="background:center/cover url('${t.cv}')"` : ''}>${t.cv ? '' : esc((t.t[0] || '♪').toUpperCase())}</div><div class="kinfo"><b>${esc(t.t)}</b><span>${esc(t.a)}</span></div></div>`
        )
        .join('') || '<p style="color:var(--dim);font-size:12px;padding:8px">Sin canciones</p>';

    // Guardar el HTML original recién generado
    window._karaOriginalHTML = l.innerHTML;

    // Restaurar el valor del buscador y aplicar el filtro
    const searchInput = document.getElementById('k-search');
    if (searchInput) {
      searchInput.value = ''; // Limpiamos al entrar de nuevo
      window.filtrarKaraoke('');
    }

    l.onclick = e => {
      const r = e.target.closest('[data-id]');
      if (r) karaPick(r.dataset.id);
    };
  }

  const ext = document.getElementById('k-ext');
  if (ext)
    ext.onclick = () => {
      const kl = document.getElementById('k-list');
      if (!kl) return;
      kl.classList.toggle('hide');
      ext.querySelector('span').textContent = (kl.classList.contains('hide') ? '▶ ' : '▼ ') + 'Canciones';
    };
  const st = document.getElementById('k-start');
  if (st)
    st.onclick = () => {
      const kl = document.getElementById('k-list');
      if (!kl) return;
      const ext = document.getElementById('k-ext');
      kl.classList.remove('hide');
      if (ext) ext.querySelector('span').textContent = '▼ Canciones';
      kara.classList.add('side-open');
    };
  const tg = document.getElementById('k-toggles');
  if (tg)
    tg.onclick = e => {
    window._karaManualTgl = true; // El usuario tomó el control
      const b = e.target.closest('[data-kt]');
      if (!b) return;
      _karaTgl = b.dataset.kt;
      tg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      applyTgl();
    };
  const vl = document.getElementById('kv-load');
  if (vl) vl.onclick = () => loadKaraVid();
  const vs = document.getElementById('kv-search');
  if (vs)
    vs.onclick = () => {
      if (!_karaSel) return;
      const t = lib.find(x => x.id === _karaSel);
      if (!t) return;
      const q2 = encodeURIComponent(t.t + ' ' + t.a + ' karaoke');
      const u = 'https://www.youtube.com/results?search_query=' + q2;
      if (window.onda && onda.openExternal) onda.openExternal(u);
      else window.open(u, '_blank');
    };
  const bpp = document.getElementById('kbar-pp');
  if (bpp) bpp.onclick = () => tog();
  const bpv = document.getElementById('kbar-pv');
  if (bpv) bpv.onclick = () => prev();
  const bnx = document.getElementById('kbar-nx');
  if (bnx) bnx.onclick = () => next(0);
  // Movimiento de botones anulado para evitar que se aplasten
  const _vw = () => localStorage.getItem('onda.kara.vid') === '1',
    _rv = () => {
      const kk = document.getElementById('kara');
      if (!kk) return;
      const on = _vw() && navigator.onLine;
      kk.classList.toggle('with-vid', on);
      kk.classList.toggle('offline', !navigator.onLine);
      const bb = document.getElementById('kbar-vid');
      if (bb) bb.classList.toggle('on', on);
    };
  const vb = document.getElementById('kbar-vid');
  if (vb)
    vb.onclick = () => {
      if (!navigator.onLine) {
        window.showAlert('Sin conexion: el video no esta disponible');
        return;
      }
      localStorage.setItem('onda.kara.vid', _vw() ? '0' : '1');
      _rv();
    };
  addEventListener('online', _rv);
  addEventListener('offline', _rv);
  _rv();
  syncKaraBar();
}

function syncKaraBar() {
  const t = q[ci];
  const ti = document.getElementById('kbar-title');
  if (ti) ti.textContent = t ? t.t + ' — ' + t.a : '-';
  const bp = document.getElementById('kbar-pp');
  if (bp) bp.textContent = A.paused ? '▶' : '⏸';
}

function karaPick(id) {
  _karaSel = id;
  const t = lib.find(x => x.id === id);
  if (!t) return;
  const kara = document.getElementById('kara');
  if (kara) {
    kara.classList.add('active');
    kara.classList.add('side-open');
  }
  const k = document.getElementById('k-know'),
    cv = document.getElementById('k-cov'),
    ti = document.getElementById('k-title'),
    ar = document.getElementById('k-artist'),
    body = document.getElementById('k-body');
  if (k) k.classList.add('on');
  if (cv) cv.style.setProperty('--kcv', t.cv ? 'url(' + t.cv + ')' : 'none');
  if (ti) ti.textContent = t.t;
  if (ar) ar.textContent = t.a + ' — ' + t.al;
  if (body) body.innerHTML = '<div class="kempty">Cargando letra...</div>';
  q = [t];
  ci = 0;
  const kl = document.getElementById('k-list');
  if (kl) kl.classList.add('hide');
  const ke = document.getElementById('k-ext');
  if (ke) ke.querySelector('span').textContent = '▶ Canciones';
  try {
    playAt(0, true);
  } catch (_) {}
  prepareKaraoke().then(() => {
    document.querySelectorAll('#k-list .krow').forEach(r => r.classList.toggle('on', r.dataset.id === id));
    syncKaraBar();
  });
}

function applyTgl() {
  const body = document.getElementById('k-body');
  if (!body) return;
  body.querySelectorAll('.kln').forEach(ln => {
    ln.classList.remove('hide-ro', 'hide-tr', 'hide-or');
    
    if (_karaTgl === 'ro') {
      ln.classList.add('hide-or'); // Muestra Romaji + Español
    } else if (_karaTgl === 'tr') {
      ln.classList.add('hide-ro'); // Muestra Español + Original
    } else if (_karaTgl === 'or') {
      ln.classList.add('hide-ro', 'hide-tr'); // Solo Original
    }
    // 'all' muestra todo
  });
}

function loadKaraVid() {
  const inp = document.getElementById('kv-url'),
    fr = document.getElementById('kv-frame'),
    kr = document.getElementById('kara');
  if (!inp || !fr) return;
  let u = (inp.value || '').trim();
  if (!u) return;
  const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{6,})/);
  if (m) u = 'https://www.youtube.com/embed/' + m[1];
  fr.innerHTML = '<iframe src="' + u + '" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
  fr.classList.add('on');
  localStorage.setItem('onda.kara.vid', '1');
  const _b = document.getElementById('kbar-vid');
  if (_b) _b.classList.add('on');
  if (kr) {
    const on = navigator.onLine;
    kr.classList.toggle('with-vid', on);
    kr.classList.toggle('offline', !on);
  }
}

async function prepareKaraoke() {
  if (!q[ci]) return window.showAlert('Reproduce una canción primero');
  const body = document.getElementById('k-body');
  if (!body) return;
  body.innerHTML = '<div class="kempty">Cargando letra...</div>';
  try {
    if (!_lyr.length || _lyrKey !== (q[ci].id || (q[ci].p && q[ci].p[0]))) {
      await loadLyr(q[ci], null);
    }
    if (!_lyr.length) {
      body.innerHTML = '<div class="kempty">No se encontró letra para esta canción</div>';
      return;
    }
    _karaActive = true;
    if (!_lyrRo.length) {
      body.innerHTML = '<div class="kempty">Preparando romaji...</div>';
      let i = 0,
        a = new Array(_lyr.length);
      const w = async () => {
        while (i < _lyr.length) {
          const k = i++;
          try {
            a[k] = (await window.onda.transliterate(_lyr[k].text, 'ja')) || '';
          } catch (e) {
            a[k] = '';
          }
        }
      };
      await Promise.all([w(), w(), w(), w()]);
      _lyrRo = a;
    }
    if (!_lyrTr.length) {
      body.innerHTML = '<div class="kempty">Traduciendo...</div>';
      let i = 0,
        a = new Array(_lyr.length);
      const w = async () => {
        while (i < _lyr.length) {
          const k = i++;
          try {
            const t = await window.onda.translate(_lyr[k].text, 'es');
            a[k] = { t: _lyr[k].t, text: t || _lyr[k].text };
          } catch (e) {
            a[k] = { t: _lyr[k].t, text: _lyr[k].text };
          }
        }
      };
      await Promise.all([w(), w(), w(), w()]);
      _lyrTr = a;
    }
    
  // DETECCIÓN DE IDIOMA: Si hay japonés, activar Romaji u Original por defecto
  if (!window._karaLangChecked) {
    window._karaLangChecked = true;
    const hasJP = /[\u3040-\u30ff\u4e00-\u9fff]/.test(_lyr.map(l => l.text).join(' '));
    if (hasJP && _karaTgl === 'all') {
      _karaTgl = 'ro'; // Por defecto Romaji para japonés
      const tg = document.getElementById('k-toggles');
      if (tg) {
        tg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.kt === 'ro'));
      }
      applyTgl();
    }
  }
  
  // DETECCIÓN DE IDIOMA
  const fullText = _lyr.map(l => l.text).join(' ');
  const hasJP = /[\u3040-\u30ff\u4e00-\u9fff]/.test(fullText);
  const tg = document.getElementById('k-toggles');
  
  if (tg) {
    const btnRo = tg.querySelector('[data-kt="ro"]');
    // Si NO es japonés, ocultamos el botón Romaji
    if (btnRo) btnRo.style.display = hasJP ? '' : 'none';
    
    // Si el usuario no ha cambiado el modo manualmente en esta canción
    if (!window._karaManualTgl) {
      if (hasJP) {
        _karaTgl = 'ro'; // Japonés -> Romaji + Español
      } else {
        _karaTgl = 'tr'; // Inglés/Otro -> Español + Original
      }
    }
    
    // Actualizar la interfaz de los botones
    tg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.kt === _karaTgl));
  }
  applyTgl();
  renderKaraoke();
  } catch (e) {
    body.innerHTML = '<div class="kempty">Error: ' + esc((e && e.message) || e) + '</div>';
  }
}

function renderKaraoke() {
  const body = document.getElementById('k-body');
  const _k = document.getElementById('kara');
  if (!body || !_karaActive || !(_k && _k.classList.contains('active')) || !_lyr.length) return;
  let idx = -1;
  for (let i = 0; i < _lyr.length; i++) {
    if (_lyr[i].t <= A.currentTime) idx = i;
    else break;
  }
  if (body.dataset.idx == String(idx) && body.dataset.rendered) return;
  body.dataset.idx = String(idx);
  body.dataset.rendered = '1';
  body.innerHTML = _lyr
    .map((l, i) => {
      const ro = _lyrRo[i] || '';
      const tr = (_lyrTr[i] && _lyrTr[i].text) || '';
      return `<div class="kln${i === idx ? ' now' : ''}" data-t="${l.t}"><div class="kro">${esc(ro)}</div><div class="ktr">${esc(tr)}</div><div class="kor">${esc(l.text)}</div></div>`;
    })
    .join('');
  body.onclick = e => {
    const ln = e.target.closest('[data-t]');
    if (ln && isFinite(A.duration)) A.currentTime = parseFloat(ln.dataset.t);
  };
  const n = body.querySelector('.kln.now');
  if (n) n.scrollIntoView({ block: 'center', behavior: 'smooth' });
}