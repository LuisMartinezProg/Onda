const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, protocol, net, globalShortcut, nativeImage, shell, session, Notification } = require('electron');
// @distube/ytdl-core se carga dinámicamente en el handler
// Recarga automática en desarrollo (No afecta al .exe final)
try {
  require('electron-reloader')(module, {
    debug: true,
    watchRenderer: true,
    ignore: ['dist', 'node_modules']
  });
} catch (_) {}

const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url'), { Readable } = require('stream');
const os = require('os');
const QRCode = require('qrcode');
const Busboy = require('busboy');

// Una sola Onda: si ya hay una abierta (aunque esté en la bandeja), la nueva no crea nada, solo muestra la existente
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.exit(0);

protocol.registerSchemesAsPrivileged([{ scheme: 'onda', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);

let jmt; try { jmt = require('jsmediatags'); } catch {}
const AUD = /\.(mp3|mpeg|mpga|flac|m4a|aac|ogg|oga|opus|wav|weba)$/i;
async function walkDir(d, out = []) {
  let es; try { es = await fs.promises.readdir(d, { withFileTypes: true }); } catch { return out; }
  for (const e of es) { const p = path.join(d, e.name); if (e.isDirectory()) await walkDir(p, out); else if (AUD.test(e.name)) out.push(p); }
  return out;
}
// ¿el archivo está dentro de la carpeta? (funciona también con raíces tipo D:\)
const inside = (file, folder) => { const r = path.relative(path.resolve(folder), path.resolve(file)); return !!r && r.split(path.sep)[0] !== '..' && !path.isAbsolute(r); };
const MIME = { mp3: 'audio/mpeg', mpeg: 'audio/mpeg', mpga: 'audio/mpeg', oga: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', weba: 'audio/webm', mp4: 'video/mp4', m4v: 'video/mp4', mkv: 'video/x-matroska', webm: 'video/webm', avi: 'video/x-msvideo', mov: 'video/quicktime', ogv: 'video/ogg', wmv: 'video/x-ms-wmv', flv: 'video/x-flv' };
// Sirve el audio con soporte de Range (necesario para adelantar/retroceder y para que Chromium lea la duración)
async function serveMedia(req, p) {
  let st; try { st = await fs.promises.stat(p); } catch { return new Response('', { status: 404 }); }
  if (!st.isFile()) return new Response('', { status: 404 });
  const size = st.size, h = { 'Content-Type': MIME[path.extname(p).slice(1).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
  if (!size) return new Response('', { status: 200, headers: { ...h, 'Content-Length': '0' } });
  let s = 0, e = size - 1, code = 200;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
  if (m && (m[1] || m[2])) {
    if (m[1] === '') s = Math.max(0, size - +m[2]); else { s = +m[1]; if (m[2]) e = Math.min(+m[2], size - 1); }
    if (s > e || s >= size) return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    code = 206; h['Content-Range'] = 'bytes ' + s + '-' + e + '/' + size;
  }
  h['Content-Length'] = String(e - s + 1);
  return new Response(Readable.toWeb(fs.createReadStream(p, { start: s, end: e })), { status: code, headers: h });
}
const clean = pf => String(pf || 'default').replace(/[^\w-]/g, '') || 'default';
const FO = new Map(); // carpetas por perfil
const cfgOf = pf => path.join(app.getPath('userData'), pf === 'default' ? 'folders.json' : 'folders-' + pf + '.json');
const fo = pf => { pf = clean(pf); if (!FO.has(pf)) { let a = []; try { a = JSON.parse(fs.readFileSync(cfgOf(pf), 'utf8')); } catch {} FO.set(pf, a); } return FO.get(pf); };
const saveFo = pf => fs.writeFileSync(cfgOf(clean(pf)), JSON.stringify(fo(pf)));
let win, tray, quitting = false;
const watchers = new Map(), timers = new Map();

const send = (ch, a) => win && !win.isDestroyed() && win.webContents.send(ch, a);

function watch(dir) {
  if (watchers.has(dir)) return;
  try {
    const w = fs.watch(dir, { recursive: true }, () => {
      clearTimeout(timers.get(dir));
      timers.set(dir, setTimeout(() => send('changed', dir), 2500));
    });
    watchers.set(dir, w);
  } catch {}
}
const unwatch = dir => { watchers.get(dir)?.close(); watchers.delete(dir); };




// ==========================================
// LIMPIAR SESIÓN DE YOUTUBE (Evita bloqueos 152/153)
// ==========================================
ipcMain.handle('clear-youtube-session', async () => {
  try {
    const { session } = require('electron');
    const ytSession = session.fromPartition('persist:ytpreview');
    await ytSession.clearStorageData();
    await ytSession.clearCache();
    console.log('[onda] Sesión de YouTube limpiada');
    return true;
  } catch (e) {
    console.error('[onda] Error limpiando sesión de YouTube:', e);
    return false;
  }
});

// ==========================================
// HOST DE LOOPBACK PARA EMBEDS DE YOUTUBE
// ==========================================
const { createServer } = require('http');
let _ytHost = null;
let _ytPort = 0;

function startYouTubeHost() {
  return new Promise((resolve) => {
    if (_ytHost) { resolve({ port: _ytPort }); return; }
    const host = createServer((req, res) => {
      const urlObj = new URL(req.url, 'http://127.0.0.1');
      const videoId = urlObj.pathname.split('/').pop();
      if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid video id');
        return;
      }
      const origin = `http://127.0.0.1:${_ytPort}`;
      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
  iframe { width: 100%; height: 100%; border: 0; display: block; }
</style>
</head>
<body>
<iframe 
  src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&origin=${encodeURIComponent(origin)}"
  allow="autoplay; encrypted-media; picture-in-picture"
  allowfullscreen
  referrerpolicy="strict-origin-when-cross-origin">
</iframe>
</body>
</html>`;
      res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
      res.end(html);
    });
    host.listen(0, '127.0.0.1', () => {
      _ytPort = host.address().port;
      _ytHost = host;
      console.log(`[onda] Host de YouTube en http://127.0.0.1:${_ytPort}`);
      resolve({ port: _ytPort });
    });
    host.on('error', (e) => {
      console.error('[onda] Error al iniciar host de YouTube:', e);
      resolve({ port: 0 });
    });
  });
}

ipcMain.handle('get-youtube-host', async () => {
  const info = await startYouTubeHost();
  return info.port;
});


// ==========================================
// OBTENER STREAM DE AUDIO (LOCAL PROXY)
// ==========================================
ipcMain.handle('audio:get-stream', async (_, url) => {
  try {
    const isYT = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/i.test(url);
    if (!isYT) return { error: 'URL de YouTube inválida' };

    const match = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    const videoId = match ? match[1] : null;
    if (!videoId) return { error: 'No se pudo extraer el ID del video' };

    // Devolvemos la URL de nuestro propio servidor local (que actúa como proxy)
    return { 
      streamUrl: `http://127.0.0.1:${_serverPort}/api/audio?id=${videoId}`, 
      title: 'Audio',
      duration: 0
    };
  } catch (e) {
    console.error('[onda] Error en audio:get-stream:', e);
    return { error: 'Error al extraer audio: ' + (e.message || e) };
  }
});

ipcMain.handle('open-external', (_, url) => {
  const u = String(url || '');
  if (!/^https:\/\/((www\.)?google\.[a-z.]+\/search|(www\.)?youtube\.com\/|youtu\.be\/)/.test(u)) return false;
  shell.openExternal(u); return true;
});
// Búsqueda en línea de solo lectura: portadas y géneros (solo estos servidores, solo HTTPS)
ipcMain.handle('web:json', async (_, url) => {
  try {
    const u = new URL(String(url || ''));
    if (u.protocol !== 'https:' || !/^(itunes\.apple\.com|api\.deezer\.com)$/.test(u.hostname)) return null;
    const r = await net.fetch(u.toString(), { headers: { 'User-Agent': 'Onda' } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
});
ipcMain.handle('fetch-image', async (_, url) => {
  if (!/^https?:\/\//i.test(String(url || ''))) return null;
  try {
    const r = await net.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 10 * 1024 * 1024) return null;
    return { data: buf.toString('base64'), type: ct.split(';')[0] };
  } catch { return null; }
});
ipcMain.handle('folders:get', (_, pf) => {
  pf = clean(pf); const a = fo(pf);
  const flag = path.join(app.getPath('userData'), 'music-auto.flag');
  if (pf === 'default' && !fs.existsSync(flag)) {
    try { const mu = app.getPath('music'); if (fs.existsSync(mu) && !a.includes(mu)) { a.push(mu); saveFo(pf); } fs.writeFileSync(flag, '1'); } catch {}
  }
  a.forEach(watch); return a;
});
ipcMain.handle('folders:add', async (_, pf) => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'], title: 'Elige una carpeta de música' });
  if (r.canceled || !r.filePaths[0]) return null;
  const d = r.filePaths[0], a = fo(pf);
  if (!a.includes(d)) { a.push(d); saveFo(pf); }
  watch(d);
  return d;
});
ipcMain.handle('folders:remove', (_, pf, d) => { const a = fo(pf), i = a.indexOf(d); if (i >= 0) { a.splice(i, 1); saveFo(pf); } });
ipcMain.handle('scan', async (_, pf, dir) => {
  if (!fo(pf).includes(dir)) return [];
  return walkDir(dir);
});

// Fase 9: tamaño de los archivos (peso mínimo al reescanear); solo dentro de las carpetas del perfil
ipcMain.handle('files:sizes', async (_, pf, files) => {
  const carpetas = fo(pf);
  const lista = Array.isArray(files) ? files.slice(0, 2000) : [];
  return Promise.all(lista.map(async f => {
    try {
      f = String(f || '');
      if (!carpetas.some(d => inside(f, d))) return -1;
      return (await fs.promises.stat(f)).size;
    } catch { return -1; }
  }));
});
ipcMain.handle('tags', (_, pf, file) => new Promise(res => {
  file = String(file || '');
  if (!jmt || !file || !fo(pf).some(f => inside(file, f))) return res({});
  const t = setTimeout(() => res({}), 5000);
  try {
    jmt.read(file, {
      onSuccess: x => { clearTimeout(t); const g = x.tags || {}; res({ title: g.title, artist: g.artist, album: g.album, track: g.track, picture: g.picture }); },
      onError: () => { clearTimeout(t); res({}); }
    });
  } catch { clearTimeout(t); res({}); }
}));

// Letras desde LRCLIB (gratis, sin clave)
ipcMain.handle('lyrics:fetch', async (_, trackName, artistName, albumName, duration) => {
  const UA = 'Onda v1.0.0 (https://github.com/usuario/onda)';
  const base = 'https://lrclib.net/api';
  const norm = s => String(s || '').normalize('NFKC').trim();
  const t  = norm(trackName);
  const a  = norm(artistName);
  const al = norm(albumName);
  const dur = Math.round(Number(duration) || 0);
  if (!t) return null;
  const hdr = { headers: { 'User-Agent': UA } };
  const hasJP = /[\u3040-\u30ff\u4e00-\u9fff]/.test(t + ' ' + a);

  const tryGet = async (params) => {
    try {
      const qs = new URLSearchParams(params);
      const r = await net.fetch(base + '/get?' + qs.toString(), hdr);
      if (!r.ok) return null;
      const j = await r.json();
      if (j && (j.syncedLyrics || j.plainLyrics)) {
        return { synced: j.syncedLyrics || null, plain: j.plainLyrics || null, track: j.trackName, artist: j.artistName };
      }
    } catch {}
    return null;
  };
  const trySearch = async (q, targetDur) => {
    try {
      const r = await net.fetch(base + '/search?q=' + encodeURIComponent(q), hdr);
      if (!r.ok) return null;
      const arr = await r.json();
      if (!Array.isArray(arr) || !arr.length) return null;
      const withLyr = arr.filter(x => x.syncedLyrics || x.plainLyrics);
      if (!withLyr.length) return null;
      const target = Number(targetDur) || 0;
      const synced = withLyr.filter(x => x.syncedLyrics);
      const pool = synced.length ? synced : withLyr;
      const best = pool.sort((x, y) => Math.abs((x.duration || 0) - target) - Math.abs((y.duration || 0) - target))[0];
      if (!best) return null;
      return { synced: best.syncedLyrics || null, plain: best.plainLyrics || null, track: best.trackName, artist: best.artistName };
    } catch {}
    return null;
  };
  const toRomaji = async (text) => {
    try {
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=en&dj=1&dt=rm&q=' + encodeURIComponent(text);
      const r = await net.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r.ok) {
        const j = await r.json();
        if (j && Array.isArray(j.sentences)) {
          const res = j.sentences.map(s => (s && s.translit) ? s.translit : '').join('').trim();
          if (res && /[a-zA-Z]{2,}/.test(res)) return res;
        }
      }
    } catch {}
    try {
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=rm&q=' + encodeURIComponent(text);
      const r = await net.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j) && Array.isArray(j[0])) {
          const res = j[0].map(x => (x && typeof x[0] === 'string') ? x[0] : '').join('').trim();
          if (res && /[a-zA-Z]{2,}/.test(res) && res !== text) return res;
        }
      }
    } catch {}
    return null;
  };
  const buscar = async (tt, aa, al2, dur2) => {
    let r;
    if (dur2 > 0) { r = await tryGet({ track_name: tt, artist_name: aa, album_name: al2, duration: String(dur2) }); if (r && r.synced) return r; }
    if (aa && dur2 > 0) { r = await tryGet({ track_name: tt, artist_name: aa, duration: String(dur2) }); if (r && r.synced) return r; }
    if (aa) { r = await tryGet({ track_name: tt, artist_name: aa }); if (r && r.synced) return r; }
    if (aa) { r = await trySearch(tt + ' ' + aa, dur2); if (r && r.synced) return r; }
    r = await trySearch(tt, dur2); if (r && r.synced) return r;
    if (aa) { r = await trySearch(aa + ' ' + tt, dur2); if (r && r.synced) return r; }
    if (aa) { r = await tryGet({ track_name: tt, artist_name: aa }); if (r) return r; }
    r = await trySearch(tt + (aa ? ' ' + aa : ''), dur2); if (r) return r;
    return null;
  };
  let r = await buscar(t, a, al, dur);
  if (r && r.synced) return r;
  if (hasJP) {
    const tRom = await toRomaji(t);
    if (tRom && tRom !== t) {
      const r2 = await buscar(tRom, a, al, dur);
      if (r2 && r2.synced) return r2;
      if (r2 && !r) r = r2;
    }
    if (a && !(r && r.synced)) {
      const aRom = await toRomaji(a);
      if (aRom && aRom !== a) {
        const r3 = await buscar(t, aRom, al, dur);
        if (r3 && r3.synced) return r3;
        if (r3 && !r) r = r3;
      }
    }
  }
  return r;
});// Transliteración (romaji para japonés) vía Google Translate

// ==========================================
// HANDLERS DE BIBLIOTECA DE VIDEOS
// ==========================================
const VIDEOS_EXT = /\.(mp4|m4v|mkv|webm|avi|mov|ogv|wmv|flv)$/i;
const VID_FOLDERS_FILE = path.join(app.getPath('userData'), 'video-folders.json');

function loadVidFolders() {
  try { return JSON.parse(fs.readFileSync(VID_FOLDERS_FILE, 'utf8')) || []; } catch { return []; }
}
function saveVidFolders(arr) {
  try { fs.writeFileSync(VID_FOLDERS_FILE, JSON.stringify(arr)); } catch {}
}

function scanVideoDir(dir, depth = 0) {
  const results = [];
  if (depth > 3) return results;
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name.startsWith('.') || item.name === 'node_modules') continue;
        results.push(...scanVideoDir(full, depth + 1));
      } else if (VIDEOS_EXT.test(item.name)) {
        try {
          const st = fs.statSync(full);
          results.push({
            path: full,
            name: path.basename(item.name, path.extname(item.name)),
            ext: path.extname(item.name).slice(1).toLowerCase(),
            size: st.size
          });
        } catch {}
      }
    }
  } catch {}
  return results;
}

ipcMain.handle('videos:add-folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return null;
  const folders = loadVidFolders();
  if (!folders.includes(r.filePaths[0])) {
    folders.push(r.filePaths[0]);
    saveVidFolders(folders);
  }
  return r.filePaths[0];
});

ipcMain.handle('videos:get-folders', () => loadVidFolders());

ipcMain.handle('videos:scan', () => {
  const folders = loadVidFolders();
  const all = [];
  for (const f of folders) all.push(...scanVideoDir(f));
  return all;
});

ipcMain.handle('videos:remove-folder', (_, dir) => {
  let folders = loadVidFolders();
  folders = folders.filter(f => f !== dir);
  saveVidFolders(folders);
  return folders;
});

ipcMain.handle('videos:open-folder', (_, dir) => {
  if (dir && fs.existsSync(dir)) shell.openPath(dir);
});


// ==========================================
// DESCARGAS DE VIDEOS (yt-dlp en formato video)
// ==========================================
const videoDownloadJobs = new Map();


// Notificacion nativa al terminar descarga
ipcMain.handle('notify:download', (_, title, kind) => {
  try {
    if (!Notification.isSupported()) return false;
    const n = new Notification({
      title: kind === 'video' ? 'Video descargado' : 'Cancion descargada',
      body: title || 'Descarga completada',
      silent: false
    });
    n.on('click', () => {
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.focus();
        win.webContents.send('cmd', kind === 'video' ? 'nav-videos' : 'nav-downloads');
      }
    });
    n.show();
    return true;
  } catch (e) { return false; }
});


// ==========================================
// BORRAR VIDEO DEL DISCO
// ==========================================
ipcMain.handle('videos:delete', async (_, filePath) => {
  if (!filePath || typeof filePath !== 'string') return { ok: false, error: 'Ruta invalida' };
  try {
    // Verificar que este dentro de las carpetas de videos
    const folders = (() => {
      try {
        const f = path.join(app.getPath('userData'), 'video-folders.json');
        return JSON.parse(fs.readFileSync(f, 'utf8')) || [];
      } catch { return []; }
    })();
    if (!folders.some(f => inside(filePath, f))) {
      return { ok: false, error: 'Fuera de las carpetas de videos' };
    }
    if (!fs.existsSync(filePath)) return { ok: true, gone: true };
    // Intentar papelera de reciclaje primero
    try {
      await shell.trashItem(filePath);
      return { ok: true, trashed: true };
    } catch {
      await fs.promises.unlink(filePath);
      return { ok: true, trashed: false };
    }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
});
ipcMain.handle('videos:download', async (_, url, quality, targetFolder) => {
  if (!/^https?:\/\//i.test(String(url || ''))) return { error: 'URL inválida' };

  // Detectar descarga duplicada
  const dup = [...videoDownloadJobs.values()].find(j => j.url === url && j.status === 'running');
  if (dup) return { id: dup.id, duplicated: true };

  // Determinar carpeta destino
  let dir = targetFolder;
  if (!dir) {
    const folders = (() => {
      try {
        const f = path.join(app.getPath('userData'), 'video-folders.json');
        return JSON.parse(fs.readFileSync(f, 'utf8')) || [];
      } catch { return []; }
    })();
    if (!folders.length) return { error: 'Añade primero una carpeta de videos' };
    dir = folders[0];
  }

  const id = 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const vendorDir = __dirname.includes('app.asar')
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'vendor')
    : path.join(__dirname, 'vendor');
  const ytdlp = path.join(vendorDir, 'yt-dlp.exe');
  const ffmpeg = path.join(vendorDir, 'ffmpeg.exe');

  // Selector de calidad
  let formatArg = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
  if (quality === '1080') formatArg = 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best';
  else if (quality === '720') formatArg = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best';
  else if (quality === '480') formatArg = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best';
  else if (quality === 'audio') formatArg = 'bestaudio/best';

  const args = [
    '-f', formatArg,
    '--merge-output-format', 'mp4',
    '--ffmpeg-location', ffmpeg,
    '--newline',
    '--no-playlist',
    '-o', path.join(dir, '%(title)s.%(ext)s'),
    url
  ];

  const proc = spawn(ytdlp, args, { windowsHide: true });
  const qualityText = quality === 'best' ? 'Mejor' : quality + 'p';
  const job = { id, url, quality, qualityText, progress: 0, status: 'running', proc, dir, file: '', title: '' };
  videoDownloadJobs.set(id, job);

  const send = (channel, payload) => win && !win.isDestroyed() && win.webContents.send(channel, payload);
  send('video:progress', { id, title: 'Conectando...', progress: 0, status: 'running', quality: qualityText });

  proc.stdout.on('data', chunk => {
    const txt = chunk.toString();
    const mp = txt.match(/\[download\]\s+([\d.]+)%/);
    if (mp) {
      job.progress = parseFloat(mp[1]);
      send('video:progress', { id, title: job.title || 'Descargando...', progress: job.progress, status: 'running', quality: qualityText });
    }
    const mtitle = txt.match(/\[download\] Destination:\s*(.+?)\.[a-z0-9]+$/m);
    if (mtitle && !job.title) {
      job.title = path.basename(mtitle[1].trim());
      send('video:progress', { id, title: job.title, progress: job.progress, status: 'running' });
    }
  });

  proc.stderr.on('data', chunk => {
    const txt = chunk.toString();
    const mtitle = txt.match(/\[download\] Destination:\s*(.+?)\.[a-z0-9]+$/m);
    if (mtitle && !job.title) {
      job.title = path.basename(mtitle[1].trim());
    }
  });

  proc.on('close', code => {
    if (code === 0) {
      job.status = 'done';
      job.progress = 100;
      send('video:progress', { id, title: job.title || 'Video', progress: 100, status: 'done', quality: qualityText });
    } else {
      const cancelled = job.status === 'cancelled';
      job.status = cancelled ? 'cancelled' : 'error';
      send('video:progress', { id, title: job.title || 'Video', progress: job.progress, status: job.status, quality: qualityText });
    }
    setTimeout(() => videoDownloadJobs.delete(id), 60000);
  });

  return { id, dir };
});

ipcMain.handle('videos:download-list', () => 
  [...videoDownloadJobs.values()].map(j => ({ id: j.id, title: j.title, progress: j.progress, status: j.status }))
);

ipcMain.handle('videos:download-cancel', (_, id) => {
  const job = videoDownloadJobs.get(id);
  if (job && job.proc) {
    job.status = 'cancelled';
    try { job.proc.kill(); } catch {}
    return true;
  }
  return false;
});

ipcMain.handle('youtube:searchList', async (_, query) => {
  if (!query || !String(query).trim()) return [];
  const vendorDir = __dirname.includes('app.asar') ? path.join(process.resourcesPath, 'app.asar.unpacked', 'vendor') : path.join(__dirname, 'vendor');
  const ytdlp = path.join(vendorDir, 'yt-dlp.exe');
  return new Promise(resolve => {
    const args = ['--dump-json', '--flat-playlist', '--no-warnings', 'ytsearch20:' + String(query)];
    const proc = spawn(ytdlp, args, { windowsHide: true });
    let buf = '';
    proc.stdout.on('data', c => { buf += c.toString(); });
    proc.on('close', () => {
      const out = [];
      for (const line of buf.split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          out.push({
            id: j.id,
            title: j.title || '(sin título)',
            channel: j.channel || j.uploader || '',
            duration: j.duration || 0,
            thumb: 'https://i.ytimg.com/vi/' + j.id + '/mqdefault.jpg'
          });
        } catch {}
      }
      resolve(out.slice(0, 20));
    });
    proc.on('error', () => resolve([]));
    setTimeout(() => { try { proc.kill(); } catch {} }, 20000);
  });
});
ipcMain.handle('youtube:search', async (_, query) => {
  if (!query || !String(query).trim()) return null;
  const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(String(query));
  try {
    const r = await net.fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
    if (m && m[1]) return { videoId: m[1] };
    const m2 = html.match(/\/watch\?v=([A-Za-z0-9_-]{11})/);
    if (m2 && m2[1]) return { videoId: m2[1] };
    return null;
  } catch { 
  // ==========================================
  // FALLBACK: lyrics.ovh (segunda fuente de letras)
  // ==========================================
  try {
    const ovhUrl = 'https://api.lyrics.ovh/v1/' + encodeURIComponent(a) + '/' + encodeURIComponent(t);
    const ovhRes = await net.fetch(ovhUrl, { headers: { 'User-Agent': 'Onda v1.0.0' } });
    if (ovhRes.ok) {
      const ovhJson = await ovhRes.json();
      if (ovhJson && ovhJson.lyrics) {
        // lyrics.ovh devuelve la letra con saltos de línea dobles al principio/final
        const cleaned = ovhJson.lyrics.replace(/^\n+|\n+$/g, '').trim();
        if (cleaned) {
          return { synced: null, plain: cleaned, track: t, artist: a };
        }
      }
    }
  } catch (e) {
    // Silencioso: si falla, seguimos con el return null
  }

return null; }
});
// === Descargador de musica (yt-dlp) ===
const { spawn } = require('child_process');
const downloadJobs = new Map();

function getDownloadsDir(pf) {
  pf = clean(pf);
  const d = path.join(app.getPath('music'), 'Onda', pf);
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
  return d;
}

const DLH = new Map();
function dlFile(pf){ pf=clean(pf); return path.join(app.getPath('userData'), pf==='default'?'downloads.json':'downloads-'+pf+'.json'); }
function dlLoad(pf){ pf=clean(pf); if(DLH.has(pf)) return DLH.get(pf); let a=[]; try{a=JSON.parse(fs.readFileSync(dlFile(pf),'utf8'));}catch{} DLH.set(pf,a); return a; }
function dlSave(pf){ pf=clean(pf); try{fs.writeFileSync(dlFile(pf),JSON.stringify(DLH.get(pf)||[]));}catch{} }

ipcMain.handle('download:start', async (_, url, profile, title, includeCover = true) => {
  if (!/^https?:\/\//i.test(String(url||''))) return { error: 'URL invalida' };
  const pf = clean(profile);
  // Evitar descargas duplicadas del mismo URL en el mismo perfil
  const dup = [...downloadJobs.values()].find(j => j.url === url && j.profile === pf && j.status === 'running');
  if (dup) return { id: dup.id, dir: dup.dir, duplicated: true };
  const dir = getDownloadsDir(pf);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const vendorDir = __dirname.includes('app.asar') ? path.join(process.resourcesPath, 'app.asar.unpacked', 'vendor') : path.join(__dirname, 'vendor');
  const ytdlp = path.join(vendorDir, 'yt-dlp.exe');
  const ffmpeg = path.join(vendorDir, 'ffmpeg.exe');
  const args = [
    '-x', '--audio-format', 'mp3', '--audio-quality', '0',
    '--embed-thumbnail', '--add-metadata',
    '--ffmpeg-location', ffmpeg,
    '--newline',
    '-o', path.join(dir, '%(title)s.%(ext)s'),
    url
  ];
  const proc = spawn(ytdlp, args, { windowsHide: true });
  const job = { id, profile: pf, title: title||'', progress: 0, status: 'running', proc, dir, url, file: '' };
  downloadJobs.set(id, job);

  const hist = dlLoad(pf);
  hist.unshift({ id, url, title: title||'', status: 'running', progress: 0, dir, file: '', at: Date.now() });
  dlSave(pf);

  const send = (channel, payload) => win && !win.isDestroyed() && win.webContents.send(channel, payload);
  send('download:progress', { id, profile: pf, title: job.title, progress: 0, status: 'running' });

  proc.stdout.on('data', chunk => {
    const txt = chunk.toString();
    const mp = txt.match(/\[download\]\s+([\d.]+)%/);
    if (mp) {
      job.progress = parseFloat(mp[1]);
      const rec = dlLoad(pf).find(x => x.id === id);
      if (rec) { rec.progress = job.progress; dlSave(pf); }
      send('download:progress', { id, profile: pf, title: job.title, progress: job.progress, status: 'running' });
    }
    const md = txt.match(/\[download\] Destination:\s*(.+)/);
    if (md) job.partialFile = md[1].trim();
    const mf = txt.match(/\[ExtractAudio\] Destination:\s*(.+)/);
    if (mf) { job.file = mf[1].trim(); job.partialFile = mf[1].trim(); }
  });

  proc.on('close', code => {
    const arr = dlLoad(pf);
    const rec = arr.find(x => x.id === id);
    if (code === 0) {
      job.status = 'done'; job.progress = 100;
      const folders = fo(pf);
      if (!folders.includes(dir)) { folders.push(dir); saveFo(pf); }
      watch(dir);
      if (rec) { rec.status = 'done'; rec.progress = 100; rec.file = job.file || ''; }
      dlSave(pf);
      send('download:progress', { id, profile: pf, title: job.title, progress: 100, status: 'done', dir });
      send('changed', dir);
    } else {
      const cancelled = job.status === 'cancelled';
      job.status = cancelled ? 'cancelled' : 'error';
      if (rec) { rec.status = job.status; }
      dlSave(pf);
      send('download:progress', { id, profile: pf, title: job.title, progress: job.progress, status: job.status });
    }
    setTimeout(() => downloadJobs.delete(id), 60000);
  });

  return { id, dir };
});

ipcMain.handle('download:list', () => [...downloadJobs.values()].map(j => ({ id: j.id, profile: j.profile, title: j.title, progress: j.progress, status: j.status })));

ipcMain.handle('download:history', (_, profile) => {
  const pf = clean(profile);
  const hist = dlLoad(pf);
  return hist.map(x => {
    const active = downloadJobs.get(x.id);
    if (active) return { ...x, status: active.status, progress: active.progress };
    return x;
  });
});

ipcMain.handle('download:cancel', (_, id) => {
  const job = downloadJobs.get(id);
  if (job && job.proc) {
    job.status = 'cancelled';
    try { job.proc.kill(); } catch {}
    // Limpiar archivos parciales que yt-dlp deja tirados
    setTimeout(() => {
      const base = job.partialFile || '';
      const candidates = [];
      if (base) {
        candidates.push(base);
        candidates.push(base + '.part');
        candidates.push(base + '.ytdl');
        candidates.push(base + '.temp');
        const stem = base.replace(/\.[^.]+$/, '');
        ['webm','m4a','mp4','mp3','opus','ogg','wav'].forEach(ext => candidates.push(stem + '.' + ext));
      }
      for (const f of candidates) {
        try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch {}
      }
    }, 800);
    const rec = dlLoad(job.profile).find(x => x.id === id);
    if (rec) { rec.status = 'cancelled'; dlSave(job.profile); }
    win && !win.isDestroyed() && win.webContents.send('download:progress', { id, profile: job.profile, title: job.title, progress: job.progress, status: 'cancelled' });
    return true;
  }
  return false;
});

ipcMain.handle('download:remove', (_, profile, id) => {
  const pf = clean(profile);
  const arr = dlLoad(pf);
  const idx = arr.findIndex(x => x.id === id);
  if (idx >= 0) {
    const rec = arr[idx];
    if (rec.file && fs.existsSync(rec.file)) {
      try { fs.unlinkSync(rec.file); } catch {}
    }
    arr.splice(idx, 1);
    dlSave(pf);
    const dir = getDownloadsDir(pf);
    watch(dir);
    win && !win.isDestroyed() && win.webContents.send('changed', dir);
  }
  return true;
});

ipcMain.handle('download:open-folder', (_, profile) => {
  const d = getDownloadsDir(profile);
  shell.openPath(d);
  return d;
});
ipcMain.handle('file:delete', async (_, profile, filePath) => {
  if (!filePath || typeof filePath !== 'string') return { ok: false, error: 'Ruta invalida' };
  const pf = clean(profile);
  // Permitir solo dentro de carpetas del perfil o de su carpeta de descargas
  const dirs = fo(pf).concat([path.join(app.getPath('music'), 'Onda', pf)]);
  const ok = dirs.some(f => inside(filePath, f));
  if (!ok) return { ok: false, error: 'Fuera de las carpetas del perfil' };
  try {
    if (!fs.existsSync(filePath)) return { ok: true, gone: true };
    // Intentar papelera de reciclaje primero, si falla unlink
    try {
      await shell.trashItem(filePath);
      return { ok: true, trashed: true };
    } catch {
      return { ok: false, error: 'No se pudo enviar a la Papelera de reciclaje' };
    }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
});
ipcMain.handle('transliterate:text', async (_, text, sourceLang) => {
  if (!text || text.length > 1500) return null;
  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + (sourceLang || 'ja') + '&tl=en&dj=1&dt=rm&q=' + encodeURIComponent(text);
    const r = await net.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (r.ok) {
      const j = await r.json();
      if (j && Array.isArray(j.sentences)) {
        const res = j.sentences.map(s => (s && s.translit) ? s.translit : '').join('').trim();
        if (res && /[a-zA-Z]{2,}/.test(res)) return res;
      }
    }
  } catch {}
  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=rm&q=' + encodeURIComponent(text);
    const r = await net.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j) && Array.isArray(j[0])) {
        const res = j[0].map(x => (x && typeof x[0] === 'string') ? x[0] : '').join('').trim();
        if (res && /[a-zA-Z]{2,}/.test(res) && res !== text) return res;
      }
    }
  } catch {}
  return null;
});// Traducción gratuita vía Google Translate (sin API key)
ipcMain.handle('translate:text', async (_, text, targetLang) => {
  if (!text || text.length > 1500) return null;
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + (targetLang || 'es') + '&dt=t&q=' + encodeURIComponent(text);
  try {
    const r = await net.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return null;
    const j = await r.json();
    if (Array.isArray(j) && Array.isArray(j[0])) {
      return j[0].map(x => x && x[0] ? x[0] : '').join('');
    }
    return null;
  } catch { return null; }
});


// ==========================================
// SERVIDOR HTTP LOCAL (LIMPIADO)
// ==========================================
const http = require('http');
const url = require('url');
let _server = null;
let _serverPort = 47891;

// Caché global para no crear la sesión de YouTube en cada clic
let _ytCache = null;
async function getYTCache() {
  if (_ytCache) return _ytCache;
  const { Innertube } = await import('youtubei.js');
  _ytCache = await Innertube.create({ retrieve_player: true });
  return _ytCache;
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const root = __dirname;
    _server = http.createServer((req, res) => {
      let pathname = url.parse(req.url).pathname;
      
      // PROXY DE AUDIO (Evita bloqueos y CORS)
      if (pathname === '/api/audio') {
        const query = url.parse(req.url, true).query;
        const videoId = query.id;
        if (!videoId) { res.writeHead(400); res.end('Missing id'); return; }
        
        (async () => {
          try {
            const tube = await getYTCache();
            const { createAdaptiveStream } = await import('simple-ytdl-core');
            const stream = await createAdaptiveStream(tube, videoId);
            
            res.writeHead(200, { 
               'Content-Type': 'audio/mp4',
               'Accept-Ranges': 'bytes',
               'Access-Control-Allow-Origin': '*'
            });
            stream.pipe(res);
          } catch (e) {
             console.error('[onda] Audio proxy error:', e);
             if (!res.headersSent) { res.writeHead(500); res.end(); }
          }
        })();
        return;
      }

      if (pathname === '/') pathname = '/index.html';
      
      const filePath = path.join(root, pathname);
      if (!filePath.startsWith(root)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      
      const ext = path.extname(filePath).toLowerCase();
      const mime = {
        '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
        '.json': 'application/json', '.woff2': 'font/woff2'
      }[ext] || 'application/octet-stream';
      
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 
          'Content-Type': mime, 
          'Access-Control-Allow-Origin': '*',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        });
        res.end(data);
      });
    });
    
    _server.listen(_serverPort, '127.0.0.1', () => {
      console.log('Servidor local en http://127.0.0.1:' + _serverPort);
      resolve();
    });
    
    _server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        _serverPort++;
        _server.listen(_serverPort, '127.0.0.1', () => {
          console.log('Servidor local en http://127.0.0.1:' + _serverPort);
          resolve();
        });
      } else {
        reject(err);
      }
    });
  });
}



// ==========================================
// SECCIÓN QR: COMPARTIR DESDE EL CELULAR
// ==========================================
let qrServer = null, qrToken = null, qrUrl = null;

function getLocalIP() {
  const nets = os.networkInterfaces();
  const virtual = ['vEthernet', 'VirtualBox', 'VMware', 'Docker', 'VPN', 'WSL', 'Loopback'];
  let fallback = null;
  for (const name of Object.keys(nets)) {
    const isVirtual = virtual.some(v => name.toLowerCase().includes(v.toLowerCase()));
    for (const net of nets[name]) {
      if (net.family !== 'IPv4' || net.internal) continue;
      if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('ethernet')) {
        if (!isVirtual) return net.address;
      }
      if (!isVirtual && !fallback) fallback = net.address;
    }
  }
  return fallback || '127.0.0.1';
}

function PAGINA_QR(token) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Subir a Onda</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#140e24;color:#f2eefc;font-family:system-ui,sans-serif;display:flex;justify-content:center;padding:20px}
.card{width:100%;max-width:440px;text-align:center}
h1{font-size:24px;margin:12px 0 4px}
p{color:#a99fc4;font-size:14px;margin:0 0 20px}
.btn{display:block;width:100%;padding:18px;border-radius:16px;background:#D4AF37;color:#1a1330;font-size:18px;font-weight:700;position:relative;overflow:hidden}
.btn input{position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer}
#resumen{margin-top:16px;font-size:14px;color:#f2eefc}
#lista{margin-top:16px;text-align:left}
.fila{background:#1f1636;border-radius:12px;padding:12px;margin-bottom:10px}
.nom{font-size:14px;word-break:break-all}
.barra{height:6px;background:#33284f;border-radius:3px;margin-top:8px;overflow:hidden}
.barra i{display:block;height:100%;width:0;background:#D4AF37}
.est{font-size:12px;color:#a99fc4;margin-top:6px}
.ok .est{color:#5ee0a0}
.mal .est{color:#ff8a8a}
</style>
</head>
<body>
  <div class="card">
    <h1>Subir a Onda</h1>
    <p>Toca el boton y elige tus canciones. Se suben solas a la PC.</p>
    <label class="btn">Elegir canciones
      <input id="f" type="file" multiple accept="audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.aac">
    </label>
    <div id="resumen">Cargando...</div>
    <div id="lista"></div>
  </div>
<script>
var TOKEN = '${token}';
var f = document.getElementById('f');
var lista = document.getElementById('lista');
var resumen = document.getElementById('resumen');
var ocupado = false;
resumen.textContent = 'Pagina lista. Toca el boton y elige tus canciones.';
function rep(m) { try { var q = new XMLHttpRequest(); q.open('GET', '/qr-log?token=' + encodeURIComponent(TOKEN) + '&m=' + encodeURIComponent(m)); q.setRequestHeader('bypass-tunnel-reminder', '1'); q.send(); } catch (e) {} }
window.onerror = function (m, s, l) { resumen.textContent = 'Error en la pagina: ' + m + ' (linea ' + l + ')'; rep('error de pagina: ' + m + ' linea ' + l); };
rep('pagina cargada');
f.addEventListener('click', function () { rep('toco el boton'); });
f.addEventListener('input', function () { rep('input disparado'); });

function subir(a, fin) {
  var fila = document.createElement('div');
  fila.className = 'fila';
  fila.innerHTML = '<div class="nom"></div><div class="barra"><i></i></div><div class="est">Subiendo...</div>';
  fila.querySelector('.nom').textContent = a.name;
  lista.appendChild(fila);
  var barra = fila.querySelector('i');
  var est = fila.querySelector('.est');
  function mal(msg) { fila.className = 'fila mal'; est.textContent = 'Error: ' + msg; rep('fallo: ' + msg); fin(false); }
  var fd = new FormData();
  fd.append('files', a, a.name);
  var x = new XMLHttpRequest();
  x.open('POST', '/qr-upload?token=' + encodeURIComponent(TOKEN));
  x.setRequestHeader('bypass-tunnel-reminder', '1');
  x.upload.onprogress = function (e) {
    if (e.lengthComputable) {
      var p = Math.round(e.loaded * 100 / e.total);
      barra.style.width = p + '%';
      est.textContent = 'Subiendo... ' + p + '%';
    }
  };
  x.onload = function () {
    rep('respuesta de la PC: ' + x.status);
    var r = null;
    try { r = JSON.parse(x.responseText); } catch (e) {}
    if (x.status === 200 && r && r.ok) {
      barra.style.width = '100%';
      fila.className = 'fila ok';
      est.textContent = 'Guardada en la PC';
      fin(true);
    } else {
      mal((r && r.error) || ('La PC no respondio bien (codigo ' + x.status + ')'));
    }
  };
  x.onerror = function () { mal('se perdio la conexion con la PC'); };
  rep('enviando ' + a.name); x.send(fd);
}

f.addEventListener('change', function () {
  var archivos = Array.prototype.slice.call(f.files || []);
  resumen.textContent = 'Elegiste ' + archivos.length + ' archivo(s).';
  rep('change: ' + archivos.length + ' archivos, primero: ' + (archivos[0] ? archivos[0].name + ' (' + archivos[0].size + ' bytes)' : 'ninguno'));
  f.value = '';
  if (!archivos.length || ocupado) return;
  ocupado = true;
  resumen.textContent = 'Subiendo ' + archivos.length + ' cancion(es)...';
  var i = 0, buenos = 0;
  function siguiente() {
    if (i >= archivos.length) {
      ocupado = false;
      resumen.textContent = buenos + ' de ' + archivos.length + ' guardadas en la PC';
      return;
    }
    subir(archivos[i++], function (ok) { if (ok) buenos++; siguiente(); });
  }
  siguiente();
});
</script>
</body>
</html>`;
}function startQRServer() {
  return new Promise((resolve, reject) => {
    if (qrServer) { resolve({ url: qrUrl, token: qrToken }); return; }
    qrToken = Math.random().toString(36).slice(2, 10);
    const ip = getLocalIP();
    
    // Creamos el servidor local normal
    qrServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

      const u = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
      console.log('[QR] Peticion:', req.method, u.pathname);
      if (u.searchParams.get('token') !== qrToken) { res.writeHead(403); res.end('Token invalido'); return; }
      
      if (req.method === 'GET' && u.pathname === '/qr-log') { console.log('[CEL]', String(u.searchParams.get('m') || '').slice(0, 200)); res.writeHead(204); res.end(); return; }
      if (req.method === 'GET' && u.pathname === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(PAGINA_QR(qrToken));
        return;
      }
      
      if (req.method === 'POST' && u.pathname === '/qr-upload') {
        const destDir = path.join(app.getPath('music'), 'Onda', 'QR');
        try { fs.mkdirSync(destDir, { recursive: true }); } catch (e) { console.error(e); }

        const saved = [], pendientes = [], abiertos = [];
        let fallo = null, respondido = false;
        const responder = (code, obj) => {
          if (respondido) return;
          respondido = true;
          res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(obj));
        };
        const bb = Busboy({ headers: req.headers, defParamCharset: 'utf8', limits: { fileSize: 500 * 1024 * 1024, files: 50 } });

        bb.on('file', (name, file, info) => {
          if (!info.filename) { file.resume(); return; }
          const safe = path.basename(String(info.filename)).replace(/[\\/:*?"<>|]/g, '_').trim() || 'archivo';
          const dest = path.join(destDir, safe);
          console.log('[QR] Recibiendo archivo:', safe);
          const ws = fs.createWriteStream(dest);
          let truncado = false;
          file.on('limit', () => { truncado = true; });
          abiertos.push({ ws, dest });
          pendientes.push(new Promise((fin) => {
            ws.on('finish', () => {
              if (truncado) {
                try { fs.unlinkSync(dest); } catch {}
                fallo = 'El archivo es demasiado grande (maximo 500 MB): ' + safe;
              } else { saved.push(safe); }
              fin();
            });
            ws.on('error', (e) => { fallo = 'No se pudo guardar ' + safe + ': ' + (e.message || e); fin(); });
          }));
          file.pipe(ws);
        });

        bb.on('close', async () => {
          await Promise.all(pendientes);
          if (fallo) { responder(500, { ok: false, error: fallo }); return; }
          try {
            const folders = fo('default');
            if (!folders.includes(destDir)) { folders.push(destDir); saveFo('default'); watch(destDir); }
          } catch (err) { console.error(err); }
          responder(200, { ok: true, saved });
          send('changed', destDir);
        });

        bb.on('error', (err) => {
          console.error('[QR] Error:', err);
          responder(500, { ok: false, error: 'Error al recibir el archivo' });
        });

        req.on('aborted', () => {
          for (const o of abiertos) { try { o.ws.destroy(); } catch {} setTimeout(() => { try { fs.unlinkSync(o.dest); } catch {} }, 500); }
        });

        req.pipe(bb);
        return;
      }
      res.writeHead(404); res.end();
    });

    qrServer.listen(47895, '0.0.0.0', async () => {
      console.log('[QR] Servidor local listo. Iniciando túnel seguro...');
      
      // Iniciar túnel automático con localtunnel
      try {
        const localtunnel = require('localtunnel');
        const tunnel = await localtunnel({ port: 47895 });
        
        qrUrl = tunnel.url + '/qr?token=' + qrToken;
        console.log('[QR] ✅ Túnel HTTPS activo en:', qrUrl);
        
        tunnel.on('close', () => { console.log('[QR] Túnel cerrado'); });
        
        resolve({ url: qrUrl, token: qrToken });
      } catch (err) {
        console.error('[QR] Error al crear túnel, usando IP local:', err);
        qrUrl = 'http://' + ip + ':47895/qr?token=' + qrToken;
        resolve({ url: qrUrl, token: qrToken });
      }
    });
    
    qrServer.on('error', reject);
  });
}

function stopQRServer() {
  if (qrServer) { try { qrServer.close(); } catch {} }
  qrServer = null; qrUrl = null; qrToken = null;
}

ipcMain.handle('qr:start', async () => {
  const info = await startQRServer();
  const qr = await QRCode.toDataURL(info.url, { width: 280, margin: 2 });
  return { ...info, qr };
});

ipcMain.handle('qr:stop', () => { stopQRServer(); return true; });

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 760, minWidth: 420, minHeight: 560, show: false,
    backgroundColor: '#140e24', autoHideMenuBar: true, icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, webviewTag: true }
  });
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => { if (!process.argv.includes('--hidden')) win.show(); }); // con --hidden arranca directo en la bandeja
  win.on('close', e => {
    // Si el usuario da clic en la X, cerramos la app al 100%
    if (!quitting) {
      quitting = true;
      
      // 1. Destruir el icono de la bandeja (si existe)
      if (tray) { try { tray.destroy(); } catch {} }
      
      // 2. Cerrar el servidor local (el del proxy de audio)
      if (_server) { try { _server.close(); } catch {} }
      
      // 3. Matar cualquier descarga de música activa
      for (const job of downloadJobs.values()) { 
        if (job.proc) { try { job.proc.kill(); } catch {} } 
      }
      
      // 4. Matar cualquier descarga de video activa
      for (const job of videoDownloadJobs.values()) { 
        if (job.proc) { try { job.proc.kill(); } catch {} } 
      }

      // 5. Forzar el cierre definitivo del proceso
      app.exit(0);
    }
  });
  startLocalServer().then(() => {
    win.loadURL('http://127.0.0.1:' + _serverPort + '/index.html');
  }).catch((err) => {
    console.error('Error al iniciar servidor local:', err);
    win.loadURL('onda://app/index.html'); // Fallback
  });
}

const showWin = () => { win.show(); win.focus(); };

app.whenReady().then(() => {
  // ==========================================
  // INTERCEPTOR DE CABECERAS PARA YOUTUBE
  // ==========================================
  try {
    const { session } = require('electron');
    
    // Instalar en la sesión por defecto
    session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*', '*://*.googlevideo.com/*'] },
      (details, callback) => {
        details.requestHeaders['Referer'] = 'https://www.youtube.com/';
        details.requestHeaders['Origin'] = 'https://www.youtube.com';
        details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        callback({ requestHeaders: details.requestHeaders });
      }
    );

    // Instalar también en la partición 'persist:ytpreview' (la que usamos en el webview)
    const ytSession = session.fromPartition('persist:ytpreview');
    ytSession.webRequest.onBeforeSendHeaders(
      { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*', '*://*.googlevideo.com/*'] },
      (details, callback) => {
        details.requestHeaders['Referer'] = 'https://www.youtube.com/';
        details.requestHeaders['Origin'] = 'https://www.youtube.com';
        details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        callback({ requestHeaders: details.requestHeaders });
      }
    );
    
    console.log('[onda] Interceptor de cabeceras para YouTube instalado');
  } catch (e) {
    console.error('[onda] Error al instalar interceptor:', e);
  }
  
  if (!gotLock) return;
  protocol.handle('onda', req => {
    const u = new URL(req.url);
    if (u.pathname === '/media') {
      const p = path.resolve(u.searchParams.get('p') || '');
      const _musicDirs = [...FO.values()].flat();
      let _videoDirs = [];
      try {
        const _vidFile = path.join(app.getPath('userData'), 'video-folders.json');
        _videoDirs = JSON.parse(fs.readFileSync(_vidFile, 'utf8')) || [];
      } catch {}
      if (!_musicDirs.concat(_videoDirs).some(f => inside(p, f))) return new Response('', { status: 403 });
      return serveMedia(req, p);
    }
    const f = path.join(__dirname, u.pathname === '/' ? 'index.html' : path.normalize(u.pathname));
    if (!f.startsWith(__dirname)) return new Response('', { status: 403 });
    return net.fetch(pathToFileURL(f).toString()).catch(() => new Response('', { status: 404 }));
  });

  createWindow();

  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 20, height: 20 }));
  tray.setToolTip('Onda');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Mostrar Onda', click: showWin },
    { label: 'Reproducir / Pausar', click: () => send('cmd', 'pp') },
    { label: 'Anterior', click: () => send('cmd', 'pv') },
    { label: 'Siguiente', click: () => send('cmd', 'nx') },
    { label: 'Iniciar con Windows', type: 'checkbox', enabled: app.isPackaged, checked: app.getLoginItemSettings().openAtLogin,
      click: i => app.setLoginItemSettings({ openAtLogin: i.checked, args: ['--hidden'] }) },
    { type: 'separator' },
    { label: 'Salir', click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on('click', showWin);

  // MediaPlayPause: solo registrada cuando suena algo (libera la tecla para YouTube u otras apps)
  let isPlaying = false;
  const syncMediaKeys = () => {
    try {
      const want = !!isPlaying;
      const have = globalShortcut.isRegistered('MediaPlayPause');
      if (want && !have) globalShortcut.register('MediaPlayPause', () => send('cmd', 'pp'));
      else if (!want && have) globalShortcut.unregister('MediaPlayPause');
    } catch {}
  };
  globalShortcut.register('MediaNextTrack', () => send('cmd', 'nx'));
  globalShortcut.register('MediaPreviousTrack', () => send('cmd', 'pv'));
  ipcMain.on('player:state', (_, playing) => { isPlaying = !!playing; syncMediaKeys(); });
});

app.on('second-instance', () => { if (!win) return; if (win.isMinimized()) win.restore(); showWin(); });
app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => { globalShortcut.unregisterAll(); if (_server) _server.close(); if (qrServer) { try { qrServer.close(); } catch {} } });
// --- PREVISUALIZACIÓN DE 60 SEGUNDOS ---
ipcMain.handle('video:previewClip', async (event, { url }) => {
  return new Promise((resolve, reject) => {
    try {
      const tempDir = app.getPath('temp');
      const outPath = path.join(tempDir, `onda_preview_${Date.now()}.mp4`);
      
      // Ruta correcta de yt-dlp (soporta modo desarrollo y modo compilado .exe)
      const vendorDir = __dirname.includes('app.asar')
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'vendor')
        : path.join(__dirname, 'vendor');
      const ytdlpPath = path.join(vendorDir, 'yt-dlp.exe');
      const ffmpegPath = path.join(vendorDir, 'ffmpeg.exe');
      
      // Comando: descargar solo los primeros 60 segundos, mejor calidad hasta 720p
      const args = [
        url,
        '--download-sections', '*0-60',
        '-f', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '--ffmpeg-location', ffmpegPath,
        '-o', outPath,
        '--no-warnings',
        '--quiet'
      ];

      const child = spawn(ytdlpPath, args);
      
      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(outPath)) {
          resolve(outPath);
        } else {
          reject(new Error('No se pudo descargar la previsualización.'));
        }
      });
      
      child.on('error', (err) => reject(err));
    } catch (e) {
      reject(e);
    }
  });
});

// --- PREVISUALIZACIÓN DE AUDIO COMPLETA (ENLACE DIRECTO) ---
ipcMain.handle('audio:getDirectUrl', async (_, url) => {
  return new Promise((resolve, reject) => {
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      
      const vendorDir = __dirname.includes('app.asar')
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'vendor')
        : path.join(__dirname, 'vendor');
      const ytdlpPath = path.join(vendorDir, 'yt-dlp.exe');
      
      // -g: get-url. Añadimos bypass para evitar bloqueos de YouTube
      const args = [
        '-g', 
        '-f', 'bestaudio[ext=m4a]/bestaudio', 
        '--extractor-args', 'youtube:player_client=android,web',
        url
      ];
      
      const child = spawn(ytdlpPath, args);
      
      let out = '';
      let err = '';
      child.stdout.on('data', (data) => { out += data.toString(); });
      child.stderr.on('data', (data) => { err += data.toString(); });
      
      child.on('close', (code) => {
        const link = out.trim().split('\n')[0];
        if (code === 0 && link.startsWith('http')) {
          resolve(link);
        } else {
          reject(new Error('yt-dlp falló: ' + err.substring(0, 100)));
        }
      });
      child.on('error', (e) => reject(e));
    } catch (e) { reject(e); }
  });
});