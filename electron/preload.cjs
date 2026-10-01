const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-window-maximized'),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window-maximized-state', (_event, isMaximized) => callback(isMaximized));
  },
  onTriggerQuickCapture: (callback) => {
    ipcRenderer.on('trigger-quick-capture', () => callback());
  },
  onTriggerScreenshot: (callback) => {
    ipcRenderer.on('trigger-screenshot', () => callback());
  },
});
