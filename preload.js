const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  toggleAlwaysOnTop: (val) => ipcRenderer.send('toggle-always-on-top', val),
  togglePillMode: (val) => ipcRenderer.send('toggle-pill-mode', val),
  moveWindow: (delta) => ipcRenderer.send('window-move', delta),
  openYouTubeLogin: () => ipcRenderer.send('open-youtube-login'),
  onLoginComplete: (callback) => ipcRenderer.on('youtube-login-complete', callback)
});
