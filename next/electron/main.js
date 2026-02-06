const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { spawn, execSync } = require('child_process');
const net = require('net');
const fs = require('fs');
const os = require('os');
const { autoUpdater } = require('electron-updater');

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

// ESC/POS: Print raw bytes to USB printer (via system print command)
ipcMain.handle('escpos-print-usb', async (event, { printerName, data }) => {
  try {
    const buffer = Buffer.from(data);
    log(`ESC/POS USB print: ${buffer.length} bytes to ${printerName}`);

    if (process.platform === 'win32') {
      // Windows: Write to temp file and use COPY command to print raw
      const tempFile = path.join(os.tmpdir(), `pos-print-${Date.now()}.bin`);
      fs.writeFileSync(tempFile, buffer);

      try {
        // Use COPY command to send raw data to printer
        execSync(`copy /b "${tempFile}" "${printerName}"`, {
          windowsHide: true,
          stdio: 'ignore',
        });
        fs.unlinkSync(tempFile);
        return { success: true };
      } catch (err) {
        fs.unlinkSync(tempFile);
        throw err;
      }
    } else {
      // macOS/Linux: Use lp command with raw option
      return new Promise((resolve) => {
        const lp = spawn('lp', ['-d', printerName, '-o', 'raw'], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        lp.stdin.write(buffer);
        lp.stdin.end();

        lp.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `lp exited with code ${code}` });
          }
        });

        lp.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      });
    }
  } catch (error) {
    log(`ESC/POS USB print error: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// ESC/POS: Print raw bytes to network printer (TCP socket)
ipcMain.handle('escpos-print-network', async (event, { host, port, data }) => {
  return new Promise((resolve) => {
    const buffer = Buffer.from(data);
    log(`ESC/POS network print: ${buffer.length} bytes to ${host}:${port}`);

    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.connect(port || 9100, host, () => {
      socket.write(buffer, () => {
        socket.end();
        resolve({ success: true });
      });
    });

    socket.on('error', (err) => {
      log(`Network print error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    });
  });
});

// ESC/POS: Test printer connection
ipcMain.handle('test-printer', async (event, { connection }) => {
  // Generate test print ESC/POS commands
  const ESC = 0x1b;
  const GS = 0x1d;
  const LF = 0x0a;

  const testCommands = [
    ESC, 0x40,                   // Init
    ESC, 0x61, 0x01,             // Center align
    ESC, 0x45, 0x01,             // Bold on
    ...Buffer.from('PRINTER TEST'),
    LF,
    ESC, 0x45, 0x00,             // Bold off
    ...Buffer.from('Connection successful!'),
    LF,
    ...Buffer.from(new Date().toLocaleString()),
    LF, LF, LF,
    GS, 0x56, 0x00,              // Cut paper
  ];

  const data = new Uint8Array(testCommands);

  if (connection.type === 'usb' && connection.usbName) {
    return await ipcMain.emit('escpos-print-usb', event, {
      printerName: connection.usbName,
      data,
    });
  } else if (connection.type === 'network' && connection.networkHost) {
    const result = await new Promise((resolve) => {
      const buffer = Buffer.from(data);
      const socket = new net.Socket();
      socket.setTimeout(5000);

      socket.connect(connection.networkPort || 9100, connection.networkHost, () => {
        socket.write(buffer, () => {
          socket.end();
          resolve({ success: true });
        });
      });

      socket.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: 'Connection timeout' });
      });
    });
    return result;
  }

  return { success: false, error: 'Invalid printer connection' };
});

// ESC/POS: Open cash drawer
ipcMain.handle('open-drawer-escpos', async (event, { connection, pin }) => {
  // Drawer kick ESC/POS command
  const ESC = 0x1b;
  const drawerCommand = pin === 5
    ? [ESC, 0x70, 0x01, 0x19, 0xfa]  // Pin 5
    : [ESC, 0x70, 0x00, 0x19, 0xfa]; // Pin 2

  const data = new Uint8Array([ESC, 0x40, ...drawerCommand]); // Init + drawer kick

  log(`Opening drawer via ${connection.type}, pin ${pin}`);

  if (connection.type === 'usb' && connection.usbName) {
    return new Promise((resolve) => {
      const buffer = Buffer.from(data);

      if (process.platform === 'win32') {
        const tempFile = path.join(os.tmpdir(), `drawer-${Date.now()}.bin`);
        fs.writeFileSync(tempFile, buffer);
        try {
          execSync(`copy /b "${tempFile}" "${connection.usbName}"`, {
            windowsHide: true,
            stdio: 'ignore',
          });
          fs.unlinkSync(tempFile);
          resolve({ success: true });
        } catch (err) {
          fs.unlinkSync(tempFile);
          resolve({ success: false, error: err.message });
        }
      } else {
        const lp = spawn('lp', ['-d', connection.usbName, '-o', 'raw'], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        lp.stdin.write(buffer);
        lp.stdin.end();
        lp.on('close', (code) => {
          resolve({ success: code === 0 });
        });
        lp.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      }
    });
  } else if (connection.type === 'network' && connection.networkHost) {
    return new Promise((resolve) => {
      const buffer = Buffer.from(data);
      const socket = new net.Socket();
      socket.setTimeout(3000);

      socket.connect(connection.networkPort || 9100, connection.networkHost, () => {
        socket.write(buffer, () => {
          socket.end();
          resolve({ success: true });
        });
      });

      socket.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: 'Connection timeout' });
      });
    });
  }

  return { success: false, error: 'No drawer printer configured' };
});

// Auto-update setup
function setupAutoUpdater() {
  autoUpdater.logger = { info: log, warn: log, error: log };

  autoUpdater.on('checking-for-update', () => log('Checking for updates...'));
  autoUpdater.on('update-available', () => log('Update available, downloading...'));
  autoUpdater.on('update-not-available', () => log('App is up to date.'));
  autoUpdater.on('download-progress', (progress) => {
    log(`Download progress: ${Math.round(progress.percent)}%`);
  });
  autoUpdater.on('update-downloaded', () => {
    log('Update downloaded. Will install on next restart.');
  });
  autoUpdater.on('error', (err) => log(`Update error: ${err.message}`));

  // Check now, then every 4 hours
  autoUpdater.checkForUpdatesAndNotify();
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 4 * 60 * 60 * 1000);
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  if (app.isPackaged) {
    setupAutoUpdater();
  }

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
