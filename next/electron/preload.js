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

  // Cash drawer (legacy)
  openDrawer: (printerName) => {
    ipcRenderer.send('open-drawer', printerName);
  },

  onDrawerResult: (callback) => {
    ipcRenderer.on('drawer-result', (event, result) => callback(result));
  },

  // ESC/POS printing
  escposPrintUsb: (printerName, data) =>
    ipcRenderer.invoke('escpos-print-usb', { printerName, data }),

  escposPrintNetwork: (host, port, data) =>
    ipcRenderer.invoke('escpos-print-network', { host, port, data }),

  testPrinter: (connection) =>
    ipcRenderer.invoke('test-printer', { connection }),

  openDrawerEscpos: (connection, pin) =>
    ipcRenderer.invoke('open-drawer-escpos', { connection, pin }),

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
