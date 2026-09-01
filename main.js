const { app, BrowserWindow, ipcMain, session, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let tray = null;

// Ensure single instance: focus existing window on duplicate launch
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Set global User-Agent fallback to genuine Firefox to bypass Google OAuth Webview blocks everywhere
app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';

// Suppress Chromium disk/GPU cache warnings on Windows and allow autoplay
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

try {
  const customUserData = path.join(app.getPath('temp'), 'focus-flow-app-data');
  app.setPath('userData', customUserData);
} catch (e) {}

let mainWindow;
let server;
let serverPort = 0;
let isPillMode = false;

const NORMAL_WIDTH = 320;
const NORMAL_HEIGHT = 490;
const PILL_WIDTH = 240;
const PILL_HEIGHT = 52;

// Dynamic port static server (Port 0 auto-allocates an open port)
function startLocalServer(onReady) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(__dirname, reqPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
        res.end(content, 'utf-8');
      }
    });
  });

  server.listen(0, '127.0.0.1', () => {
    serverPort = server.address().port;
    if (onReady) onReady();
  });
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // Fix YouTube embed streaming by giving youtube embed valid origins while leaving googlevideo CDN streams intact
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'] },
    (details, callback) => {
      details.requestHeaders['User-Agent'] = userAgent;
      details.requestHeaders['Origin'] = 'https://www.youtube.com';
      details.requestHeaders['Referer'] = 'https://www.youtube.com/';
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

  mainWindow = new BrowserWindow({
    width: NORMAL_WIDTH,
    height: NORMAL_HEIGHT,
    x: Math.max(20, width - NORMAL_WIDTH - 50),
    y: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    skipTaskbar: false,
    show: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      webviewTag: true,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  mainWindow.webContents.setUserAgent(userAgent);
  mainWindow.loadURL(`http://127.0.0.1:${serverPort}/index.html`);

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.focus();

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createTray();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});

app.whenReady().then(() => {
  startLocalServer(() => {
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function createTray() {
  if (tray) return;

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#9333ea"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><circle cx="16" cy="16" r="14" fill="url(#grad)" stroke="#ffffff" stroke-width="1.5"/><polygon points="17,6 10,17 15,17 14,26 22,14 17,14" fill="#ffffff"/></svg>`;
  const icon = nativeImage.createFromBuffer(Buffer.from(iconSvg)).resize({ width: 18, height: 18 });

  tray = new Tray(icon);
  tray.setToolTip('Focus Flow - Productive Pomodoro & Audio');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '⚡ Show Focus Flow',
      click: () => showAndRestoreWindow()
    },
    {
      label: '🔲 Toggle Floating Pill Mode',
      click: () => {
        showAndRestoreWindow();
        if (mainWindow) mainWindow.webContents.send('toggle-pill-from-tray');
      }
    },
    { type: 'separator' },
    {
      label: '✕ Exit Focus Flow',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    showAndRestoreWindow();
  });

  tray.on('double-click', () => {
    showAndRestoreWindow();
  });
}

function showAndRestoreWindow() {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
}

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.hide();
    createTray();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('toggle-always-on-top', (event, value) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(value, 'screen-saver');
  }
});

ipcMain.on('toggle-pill-mode', (event, toPill) => {
  if (!mainWindow) return;
  isPillMode = toPill;

  const currentBounds = mainWindow.getBounds();
  const currentDisplay = screen.getDisplayMatching(currentBounds);
  const workArea = currentDisplay.workArea;

  const targetWidth = isPillMode ? PILL_WIDTH : NORMAL_WIDTH;
  const targetHeight = isPillMode ? PILL_HEIGHT : NORMAL_HEIGHT;

  // Intelligently clamp window position to ensure it stays fully inside the screen workArea
  let safeX = currentBounds.x;
  let safeY = currentBounds.y;

  const margin = 12;
  if (safeX + targetWidth > workArea.x + workArea.width - margin) {
    safeX = workArea.x + workArea.width - targetWidth - margin;
  }
  if (safeX < workArea.x + margin) {
    safeX = workArea.x + margin;
  }

  if (safeY + targetHeight > workArea.y + workArea.height - margin) {
    safeY = workArea.y + workArea.height - targetHeight - margin;
  }
  if (safeY < workArea.y + margin) {
    safeY = workArea.y + margin;
  }

  mainWindow.setBounds({
    x: Math.round(safeX),
    y: Math.round(safeY),
    width: targetWidth,
    height: targetHeight
  }, true);
});

ipcMain.on('window-move', (event, { deltaX, deltaY }) => {
  if (!mainWindow) return;
  const currentBounds = mainWindow.getBounds();
  const currentDisplay = screen.getDisplayMatching(currentBounds);
  const workArea = currentDisplay.workArea;

  let newX = Math.round(currentBounds.x + deltaX);
  let newY = Math.round(currentBounds.y + deltaY);

  // Keep window top grab header visible on screen
  const minVisible = 40;
  newX = Math.max(workArea.x - currentBounds.width + minVisible, Math.min(workArea.x + workArea.width - minVisible, newX));
  newY = Math.max(workArea.y, Math.min(workArea.y + workArea.height - minVisible, newY));

  mainWindow.setPosition(newX, newY);
});

// Dedicated YouTube Login Window for Premium Authentication
let loginWindow = null;
ipcMain.on('open-youtube-login', () => {
  if (loginWindow) {
    loginWindow.focus();
    return;
  }

  // Google allows Firefox User-Agent without triggering "Less Secure App / Webview" blocks
  const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';
  const ytSession = session.fromPartition('persist:youtube_profile');

  ytSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = firefoxUA;
    // Strip Chromium Client Hints headers so Google treats the session purely as Firefox
    delete details.requestHeaders['sec-ch-ua'];
    delete details.requestHeaders['sec-ch-ua-mobile'];
    delete details.requestHeaders['sec-ch-ua-platform'];
    delete details.requestHeaders['Sec-CH-UA'];
    delete details.requestHeaders['Sec-CH-UA-Mobile'];
    delete details.requestHeaders['Sec-CH-UA-Platform'];
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  loginWindow = new BrowserWindow({
    width: 580,
    height: 720,
    title: 'Sign in to YouTube Premium',
    autoHideMenuBar: true,
    backgroundColor: '#0f111a',
    webPreferences: {
      partition: 'persist:youtube_profile',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  loginWindow.webContents.setUserAgent(firefoxUA);
  loginWindow.loadURL('https://www.youtube.com/');

  loginWindow.on('closed', () => {
    loginWindow = null;
    if (mainWindow) {
      mainWindow.webContents.send('youtube-login-complete');
    }
  });
});

