const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('onda', {
  folders: pf => ipcRenderer.invoke('folders:get', pf),
  add: pf => ipcRenderer.invoke('folders:add', pf),
  remove: (pf, d) => ipcRenderer.invoke('folders:remove', pf, d),
  scan: (pf, d) => ipcRenderer.invoke('scan', pf, d),
  tags: (pf, f) => ipcRenderer.invoke('tags', pf, f),
  openExternal: url => ipcRenderer.invoke('open-external', url),
  fileDelete: (pf, p) => ipcRenderer.invoke('file:delete', pf, p),
  fetchImage: url => ipcRenderer.invoke('fetch-image', url),
  fetchLyrics: (track, artist, album, dur) => ipcRenderer.invoke('lyrics:fetch', track, artist, album, dur),
  translate: (text, lang) => ipcRenderer.invoke('translate:text', text, lang),
  transliterate: (text, lang) => ipcRenderer.invoke('transliterate:text', text, lang),
  notify: (title, kind) => ipcRenderer.invoke('notify:download', title, kind),
  videos: {
    delete: (p) => ipcRenderer.invoke('videos:delete', p),
    download: (url, quality, folder) => ipcRenderer.invoke('videos:download', url, quality, folder),
    downloadList: () => ipcRenderer.invoke('videos:download-list'),
    downloadCancel: (id) => ipcRenderer.invoke('videos:download-cancel', id),
    addFolder: () => ipcRenderer.invoke('videos:add-folder'),
    getFolders: () => ipcRenderer.invoke('videos:get-folders'),
    scan: () => ipcRenderer.invoke('videos:scan'),
    removeFolder: (dir) => ipcRenderer.invoke('videos:remove-folder', dir),
    openFolder: (dir) => ipcRenderer.invoke('videos:open-folder', dir)
  },
  download: { 
    start: (url, pf, title, includeCover) => ipcRenderer.invoke('download:start', url, pf, title, includeCover), 
    list: () => ipcRenderer.invoke('download:list'), 
    history: (pf) => ipcRenderer.invoke('download:history', pf), 
    cancel: (id) => ipcRenderer.invoke('download:cancel', id), 
    remove: (pf, id) => ipcRenderer.invoke('download:remove', pf, id), 
    openFolder: (pf) => ipcRenderer.invoke('download:open-folder', pf) 
  },
  youtubeSearch: q => ipcRenderer.invoke('youtube:search', q),
  youtubeSearchList: q => ipcRenderer.invoke('youtube:searchList', q),
  playerState: playing => ipcRenderer.send('player:state', playing),
  clearYouTubeSession: () => ipcRenderer.invoke('clear-youtube-session'),
  getYouTubeHost: () => ipcRenderer.invoke('get-youtube-host'),
  getAudioStream: (url) => ipcRenderer.invoke('audio:get-stream', url),
  getAudioDirectUrl: (url) => ipcRenderer.invoke('audio:getDirectUrl', url),
  on: (ch, fn) => ipcRenderer.on(ch, (_, a) => fn(a))
});