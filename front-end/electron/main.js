// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");

if (require("electron-squirrel-startup")) app.quit();

let mainWindow;

function log(message) {
  mainWindow.webContents.send("log", message);
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
    },
  });

  // and load the index.html of the app.
  const indexPath = path.join(__dirname, "../dist/index.html");
  mainWindow.loadURL(`file://${indexPath}`);

  mainWindow.webContents.on("did-finish-load", () => {
    ipcMain.on("get-printers", (event) => {
      mainWindow.webContents.getPrintersAsync().then((printers) => {
        event.sender.send("printers-list", printers);
      });
    });
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

ipcMain.on("print", (event, config) => {
  const printConfig = {
    dpi: { horizontal: 200, vertical: 200 },
    preferCssPageSize: true,
    margins: {
      marginType: "none",
    },
    ...config,
  };
  log({ m: "Print", printConfig });
  mainWindow.webContents.print(
    {
      dpi: { horizontal: 200, vertical: 200 },
      preferCssPageSize: true,
      margins: {
        marginType: "none",
      },
      ...config,
    },
    (success, failureReason) => {
      log({ m: "Print result", success, failureReason });
    }
  );
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
