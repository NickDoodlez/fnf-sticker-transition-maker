const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scan: () => ipcRenderer.invoke('scan'),
  readFile: (file) => ipcRenderer.invoke('read-file', file),
  openFolder: (kind) => ipcRenderer.invoke('open-folder', kind),
  pickImage: (options) => ipcRenderer.invoke('pick-image', options),
  reveal: (target) => ipcRenderer.invoke('reveal', target),
  exportChoose: (options) => ipcRenderer.invoke('export-choose', options),
  exportStart: (options) => ipcRenderer.invoke('export-start', options),
  exportFrame: (data) => ipcRenderer.invoke('export-frame', data),
  exportFinish: () => ipcRenderer.invoke('export-finish'),
  exportCancel: () => ipcRenderer.invoke('export-cancel')
});
