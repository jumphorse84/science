const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scienceUpdater', {
  onStatus(callback) {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('updater:status', listener);
    return () => ipcRenderer.removeListener('updater:status', listener);
  },
  checkForUpdates() {
    return ipcRenderer.invoke('updater:check');
  },
  downloadUpdate() {
    return ipcRenderer.invoke('updater:download');
  },
  restartToUpdate() {
    return ipcRenderer.invoke('updater:restart');
  },
});

contextBridge.exposeInMainWorld('scienceDesktop', {
  notify(payload) {
    return ipcRenderer.invoke('desktop:notify', payload);
  },
  flashFrame(enabled) {
    return ipcRenderer.invoke('desktop:flash', enabled);
  },
});
