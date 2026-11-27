// Actualizacion automatica de Onda.
// Solo actua en la app instalada (con "npm start" no hace nada).
const { app, dialog } = require('electron');
const fs = require('fs'), path = require('path');

let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; } catch (e) { autoUpdater = null; }

// Guarda un registro en %APPDATA%\Onda\actualizaciones.log por si algo falla
function log(...partes) {
  try {
    const f = path.join(app.getPath('userData'), 'actualizaciones.log');
    const txt = partes.map(x => (x && x.message) || String(x)).join(' ');
    fs.appendFileSync(f, new Date().toISOString() + ' ' + txt + '\n');
  } catch (e) {}
}

app.whenReady().then(() => {
  if (!app.isPackaged) return;
  if (!autoUpdater) { log('electron-updater no esta instalado'); return; }

  autoUpdater.logger = { info: log, warn: log, error: log, debug() {} };
  autoUpdater.autoDownload = true;          // descarga sola en segundo plano
  autoUpdater.autoInstallOnAppQuit = true;  // si eliges "Mas tarde", se instala al salir de Onda
  autoUpdater.allowPrerelease = false;

  let descargada = false;

  autoUpdater.on('checking-for-update', () => log('Buscando actualizacion...'));
  autoUpdater.on('update-available', i => log('Hay version nueva:', i.version));
  autoUpdater.on('update-not-available', () => log('Onda esta al dia'));
  autoUpdater.on('error', e => log('Error al actualizar:', e));

  autoUpdater.on('update-downloaded', async info => {
    if (descargada) return;
    descargada = true;
    log('Version descargada:', info.version);
    try {
      const r = await dialog.showMessageBox({
        type: 'info',
        title: 'Onda',
        message: 'Hay una actualizaci\u00f3n nueva de Onda',
        detail: 'Ya est\u00e1 descargada. \u00bfQuieres reiniciar Onda ahora para instalarla? Si eliges "M\u00e1s tarde", se instalar\u00e1 sola la pr\u00f3xima vez que salgas de Onda.',
        buttons: ['Reiniciar ahora', 'M\u00e1s tarde'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      });
      if (r.response === 0) autoUpdater.quitAndInstall(true, true);
    } catch (e) { log(e); }
  });

  const buscar = () => {
    if (descargada) return;
    try { autoUpdater.checkForUpdates().catch(e => log('No pude buscar:', e)); } catch (e) { log(e); }
  };
  setTimeout(buscar, 15000);                   // 15 segundos despues de abrir
  setInterval(buscar, 4 * 60 * 60 * 1000);     // y cada 4 horas
});
