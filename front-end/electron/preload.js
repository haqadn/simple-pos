const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  getPrinters: () => {
    ipcRenderer.send("get-printers");
  },
  onPrintersList: (callback) => {
    ipcRenderer.on("printers-list", (event, printers) => callback(printers));
  },
});
