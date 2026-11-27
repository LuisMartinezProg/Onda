/* Vista QR con Panel de Diagnóstico */
function viewQR(v) {
  v.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; padding: 20px; text-align:center;">
      <h2 style="font-size: 28px; margin-bottom: 8px; color: var(--ink);">Compartir desde el celular</h2>
      <div id="lan-box" style="width:100%; max-width:420px; background:#1f1636; border:1px solid #D4AF37; border-radius:16px; padding:16px; margin-bottom:24px; text-align:center;">
        <div style="color: var(--dim); font-size:12px; font-weight:bold; text-transform:uppercase; margin-bottom:10px;">Conexion por WiFi (recomendada)</div>
        <div style="color: var(--dim); font-size:13px;">Direccion</div>
        <div id="lan-addr" style="font-size:22px; font-weight:700; color: var(--ink); margin-bottom:12px;">...</div>
        <div style="color: var(--dim); font-size:13px;">Codigo</div>
        <div id="lan-code" style="font-size:30px; font-weight:800; letter-spacing:6px; color:#D4AF37;">......</div>
        <p style="color: var(--dim); font-size:12px; margin:12px 0 0; line-height:1.5;">Escribe estos dos datos una sola vez en Onda del celular. El celular y el PC deben estar en el mismo WiFi.</p>
      </div>
      <p style="color: var(--dim); margin-bottom: 30px; max-width: 400px; line-height: 1.6; font-size: 14px;">
        Escanea el código con la cámara. Se abrirá una página segura para subir canciones a <b>Música/Onda/QR</b>.
      </p>
      
      <div id="qr-container" style="background: white; padding: 16px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; min-width: 280px; min-height: 280px; margin-bottom: 20px;">
        <span style="color: #666; font-size: 14px; font-weight: 600;">Servidor inactivo</span>
      </div>
      
      <button class="chip ed-ok" id="qr-btn" style="font-size: 15px; padding: 12px 32px; border-radius: 12px; font-weight: 700; cursor: pointer; margin-bottom: 20px;">
        Activar Conexión
      </button>
      
      <!-- PANEL DE DIAGNÓSTICO -->
      <div style="width: 100%; max-width: 500px; background: #000; border: 1px solid var(--ed); border-radius: 12px; padding: 15px; text-align: left;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center;">
            <span style="color: var(--dim); font-size: 12px; font-weight: bold; text-transform: uppercase;">Consola de Diagnóstico en Vivo</span>
            <button id="btn-clear" style="background: transparent; border: 1px solid var(--ed); color: var(--dim); padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 11px;">Limpiar</button>
        </div>
        <div id="qr-logs" style="font-family: monospace; font-size: 12px; color: #00b894; height: 120px; overflow-y: auto; line-height: 1.6;"></div>
      </div>
    </div>
  `;

  (async () => {
    try {
      const i = await window.onda.lanInfo();
      document.getElementById('lan-addr').textContent = i.ip + ':' + i.port + (i.activo ? '' : '  (sin conexion)');
      document.getElementById('lan-code').textContent = i.code;
    } catch (e) {
      document.getElementById('lan-addr').textContent = 'No disponible. Reinicia Onda.';
    }
  })();
  const container = document.getElementById('qr-container');
  const btn = document.getElementById('qr-btn');
  const logs = document.getElementById('qr-logs');
  let activo = false;

  // Función para añadir mensajes a la consola visual
  const addLog = (msg) => {
    const div = document.createElement('div');
    div.textContent = msg;
    if (msg.includes('⚠️')) div.style.color = '#fdcb6e';
    if (msg.includes('✅')) div.style.color = '#00b894';
    if (msg.includes('⏳')) div.style.color = '#a29bfe';
    logs.appendChild(div);
    logs.scrollTop = logs.scrollHeight;
  };

  document.getElementById('btn-clear').onclick = () => logs.innerHTML = '';

  // Escuchar los logs que vienen desde Node.js
  if (window.onda.qrLog) {
      window.onda.qrLog(addLog);
  }

  btn.onclick = async () => {
    if (!activo) {
      btn.disabled = true;
      btn.textContent = 'Iniciando...';
      logs.innerHTML = '';
      addLog('Iniciando servidor QR...');
      
      try {
        const info = await window.onda.qrStart();
        container.innerHTML = `<img src="${info.qr}" style="width:260px;height:260px;border-radius:12px;">`;
        btn.textContent = 'Detener Conexión';
        btn.style.background = '#ff7675';
        addLog('✅ Servidor en línea. Esperando conexión del celular...');
        activo = true;
      } catch (e) {
        addLog('❌ Error al iniciar: ' + (e.message || e));
        btn.textContent = 'Activar Conexión';
      } finally {
        btn.disabled = false;
      }
    } else {
      await window.onda.qrStop();
      container.innerHTML = '<span style="color: #666; font-size: 14px; font-weight: 600;">Servidor inactivo</span>';
      btn.textContent = 'Activar Conexión';
      btn.style.background = '';
      addLog('Servidor detenido.');
      activo = false;
    }
  };
}
