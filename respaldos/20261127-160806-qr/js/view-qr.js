/* Vista QR: compartir canciones del celular a la PC */
function viewQR(v) {
  v.innerHTML = `
    <h2>Compartir desde el celular</h2>
    <div class="onda-card" style="max-width:560px;text-align:center">
      <p style="color:var(--dim);line-height:1.5">
        Escanea el código con la cámara del celular.<br>
        Se abrirá una página para subir canciones a <code>Música/Onda/QR</code>.<br>
        La primera vez Windows preguntará si permites la conexión: <b>marca Redes privadas</b>.
      </p>
      <div id="qr-box" style="margin:16px 0">
        <p style="color:var(--dim)">Servidor inactivo.</p>
      </div>
      <button class="chip ed-ok" id="qr-toggle">Activar QR</button>
      <p id="qr-msg" style="color:var(--dim);font-size:13px;margin-top:12px"></p>
    </div>
  `;

  const box = document.getElementById('qr-box');
  const btn = document.getElementById('qr-toggle');
  const msg = document.getElementById('qr-msg');
  let activo = false;

  btn.onclick = async () => {
    if (!activo) {
      btn.disabled = true;
      msg.textContent = 'Iniciando servidor...';
      try {
        const info = await window.onda.qrStart();
        box.innerHTML = `
          <img src="${info.qr}" style="width:260px;height:260px;border-radius:12px;background:#fff;padding:8px">
          <p style="color:var(--dim);font-size:12px;word-break:break-all;margin-top:8px">${info.url}</p>
        `;
        btn.textContent = 'Detener QR';
        msg.textContent = '✅ Activo. Escanea el código desde el celular.';
        activo = true;
      } catch (e) {
        msg.textContent = '❌ No se pudo iniciar: ' + (e.message || e);
      } finally {
        btn.disabled = false;
      }
    } else {
      await window.onda.qrStop();
      box.innerHTML = '<p style="color:var(--dim)">Servidor inactivo.</p>';
      btn.textContent = 'Activar QR';
      msg.textContent = '';
      activo = false;
    }
  };
}