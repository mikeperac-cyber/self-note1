const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    frame: false, // Frameless window to use sleek custom Windows 11 titlebar
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-state', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-state', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Windows System Tray Integration
function createTray() {
  try {
    const iconPath = path.join(__dirname, '../public/favicon.ico');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

    const contextMenu = Menu.buildFromTemplate([
      { label: 'WorkSpace Pro OS', enabled: false },
      { type: 'separator' },
      { label: 'Open WorkSpace', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
      { label: 'Quick Capture', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.webContents.send('trigger-quick-capture'); } } },
      { label: 'Take Screenshot', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.webContents.send('trigger-screenshot'); } } },
      { type: 'separator' },
      { label: 'Quit WorkSpace', click: () => { app.quit(); } },
    ]);

    tray.setToolTip('WorkSpace Pro - Windows Desktop');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) mainWindow.show();
    });
  } catch (err) {
    console.error('Tray creation failed:', err);
  }
}

// App Lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Register Global Desktop Hotkeys
  try {
    globalShortcut.register('CommandOrControl+Shift+N', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.webContents.send('trigger-quick-capture');
      }
    });

    globalShortcut.register('CommandOrControl+Shift+S', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.webContents.send('trigger-screenshot');
      }
    });
  } catch (err) {
    console.warn('Global shortcut registration error:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC Window Controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('is-window-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});
