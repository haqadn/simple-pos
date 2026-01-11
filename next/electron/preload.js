const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Printer operations
  getPrinters: () => ipcRenderer.invoke('get-printers'),

  print: (config) => {
    ipcRenderer.send('print', config);
  },

  onPrintResult: (callback) => {
    ipcRenderer.on('print-result', (event, result) => callback(result));
  },

  // Cash drawer
  openDrawer: (printerName) => {
    ipcRenderer.send('open-drawer', printerName);
  },

  onDrawerResult: (callback) => {
    ipcRenderer.on('drawer-result', (event, result) => callback(result));
  },

  // Logging from main process
  onLog: (callback) => {
    ipcRenderer.on('log', (event, message) => callback(message));
  },

  // Check if running in Electron
  isElectron: true,
});

// Log messages from main process to console
ipcRenderer.on('log', (event, message) => {
  console.log('[Electron Main]', message);
});
