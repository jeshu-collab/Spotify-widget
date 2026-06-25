const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const { Worker } = require('worker_threads');
const path = require('path');
const { exec } = require('child_process');

app.commandLine.appendSwitch('ignore-certificate-errors');

let widget;
let tray = null;

// --- MULTITHREADED ENGINE ---
function startMediaTracker() {
  const worker = new Worker(path.join(__dirname, 'media-worker.js'));
  worker.on('message', (trackInfo) => {
    if (widget) widget.webContents.send('update-track', trackInfo);
  });
  worker.on('error', (err) => {
    console.error('Worker crashed:', err);
  });
}

// --- NATIVE CONTROLS RECEIVER (PLAYBACK & VOLUME) ---
function runVbsCommand(command) {
  let scriptPath = path.join(__dirname, 'media-keys.vbs');
  if (scriptPath.includes('app.asar')) {
    scriptPath = scriptPath.replace('app.asar', 'app.asar.unpacked');
  }
  exec(`cscript //nologo "${scriptPath}" ${command}`, (error) => {
    if (error) console.error(`VBS command [${command}] failed:`, error);
  });
}

ipcMain.on('media-command', (event, command) => {
  runVbsCommand(command);
});

ipcMain.on('change-volume', (event, direction) => {
  const vbsAction = direction === 'up' ? 'volUp' : 'volDown';
  runVbsCommand(vbsAction);
});



ipcMain.on('toggle-lyrics-window', (event, isExpanding) => {
  if (!widget) return;
  const currentBounds = widget.getBounds();
  if (isExpanding) {
    widget.setMaximumSize(500, 300);
    widget.setBounds({ width: currentBounds.width, height: 300 });
    widget.setMinimumSize(300, 300);
  } else {
    widget.setMinimumSize(300, 140);
    widget.setBounds({ width: currentBounds.width, height: 140 });
    widget.setMaximumSize(500, 140);
  }
});

// --- APP INITIALIZATION ---
function createWidget() {
  widget = new BrowserWindow({
    width: 350,
    height: 140,
    minWidth: 350,
    maxWidth: 350,
    minHeight: 140,
    maxHeight: 140,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  widget.loadFile('index.html');
  startMediaTracker();

  // SYSTEM TRAY SETUP
  const iconPath = path.join(__dirname, 'tray-icon.ico');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Widget', click: () => widget.show() },
    { label: 'Hide Widget', click: () => widget.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
  ]);
  tray.setToolTip('Spotify Glass Widget');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    widget.isVisible() ? widget.hide() : widget.show();
  });

  widget.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      widget.hide();
    }
    return false;
  });
}

app.whenReady().then(createWidget);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});