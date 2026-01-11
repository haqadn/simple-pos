const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { spawn } = require('child_process');

// Handle Squirrel events for Windows installer
if (require('electron-squirrel-startup')) app.quit();

let mainWindow;
let nextServer;

function log(message) {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send('log', message);
  }
  console.log('[Main]', message);
}

function startNextServer() {
  return new Promise((resolve) => {
    const isDev = !app.isPackaged;

    if (isDev) {
      // In development, use the URL from environment or default to 3000
      const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:3000';
      log(`Development mode - using ${devUrl}`);
      resolve(devUrl);
      return;
    }

    // In production, start the Next.js server
    const serverPath = path.join(__dirname, '../.next/standalone/server.js');
    nextServer = spawn('node', [serverPath], {
      env: { ...process.env, PORT: '3000' },
      cwd: path.join(__dirname, '../.next/standalone'),
    });

    nextServer.stdout.on('data', (data) => {
      const output = data.toString();
      log(output);
      if (output.includes('Ready') || output.includes('started')) {
        resolve('http://localhost:3000');
      }
    });

    nextServer.stderr.on('data', (data) => {
      log(`Server error: ${data}`);
    });

    // Fallback resolve after timeout
    setTimeout(() => resolve('http://localhost:3000'), 3000);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Get the URL to load
  const url = await startNextServer();

  log(`Loading URL: ${url}`);
  mainWindow.loadURL(url);

  // Set up IPC handlers after window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    log('Window loaded');
  });

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

// IPC: Get available printers
ipcMain.handle('get-printers', async () => {
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    log(`Found ${printers.length} printers`);
    return printers;
  } catch (error) {
    log(`Error getting printers: ${error.message}`);
    return [];
  }
});

// IPC: Print
ipcMain.on('print', (event, config) => {
  const printConfig = {
    silent: true,
    printBackground: true,
    preferCssPageSize: true,
    margins: { marginType: 'none' },
    dpi: { horizontal: 203, vertical: 203 },
    ...config,
  };

  log({ action: 'print', config: printConfig });

  mainWindow.webContents.print(printConfig, (success, failureReason) => {
    if (success) {
      log('Print successful');
    } else {
      log(`Print failed: ${failureReason}`);
    }
    event.sender.send('print-result', { success, failureReason });
  });
});

// IPC: Open cash drawer (sends drawer kick command)
ipcMain.on('open-drawer', (event, printerName) => {
  log({ action: 'open-drawer', printer: printerName });
  // Drawer kick is typically done by printing an empty page with ESC/POS command
  // For now, just log it - actual implementation depends on printer setup
  event.sender.send('drawer-result', { success: true });
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});
