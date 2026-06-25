const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const { Worker } = require('worker_threads');
const path = require('path');
const { exec } = require('child_process');

app.commandLine.appendSwitch('ignore-certificate-errors');

let widget;
let tray = null;
let internalSavedVol = 50;

function startMediaTracker() {
  const worker = new Worker(path.join(__dirname, 'media-worker.js'));
  worker.on('message', (trackInfo) => {
    if (widget) widget.webContents.send('update-track', trackInfo);
  });
  worker.on('error', (err) => {
    console.error('Worker crashed:', err);
  });
}

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

// --- BLAZING FAST NATIVE VOLUME ROUTER ---

ipcMain.on('change-volume', (event, data) => {
  if (!data || data.value === undefined || data.value === internalSavedVol) return;

  // Calculate the difference so we can jump multiple steps instantly without lagging
  const diff = data.value - internalSavedVol;
  const steps = Math.max(1, Math.round(Math.abs(diff) / 2)); // 1 step = ~2% system volume
  const directionKey = diff > 0 ? '175' : '174'; // 175 = VolUp, 174 = VolDown

  internalSavedVol = data.value;

  // Bypasses your VBScript entirely and executes multiple volume steps in ONE microsecond loop
  const psCommand = `powershell -WindowStyle Hidden -NoProfile -Command "$wshell = New-Object -ComObject WScript.Shell; 1..${steps} | ForEach-Object { $wshell.SendKeys([char]${directionKey}) }"`;

  exec(psCommand, (error) => {
    if (error) console.error("Volume Step Error:", error);
  });
});

// --- RESIZING LIFECYCLE MANAGEMENT LOOP ---
ipcMain.on('toggle-volume-frame', (event, isExpanding) => {
  if (!widget) return;
  const bounds = widget.getBounds();

  if (isExpanding) {
    widget.setMaximumSize(360, 140);
    widget.setBounds({ width: 360, height: 140, x: bounds.x, y: bounds.y });
  } else {
    widget.setBounds({ width: 310, height: 140, x: bounds.x, y: bounds.y });
    widget.setMaximumSize(310, 140);
  }
});

ipcMain.on('toggle-lyrics-window', (event, isExpanding) => {
  if (!widget) return;
  const currentBounds = widget.getBounds();
  if (isExpanding) {
    widget.setMaximumSize(360, 300);
    widget.setBounds({ width: currentBounds.width, height: 300 });
    widget.setMinimumSize(310, 300);
  } else {
    widget.setMinimumSize(310, 140);
    widget.setBounds({ width: currentBounds.width, height: 140 });
    widget.setMaximumSize(360, 140);
  }
});

function createWidget() {
  widget = new BrowserWindow({
    width: 360,
    height: 140,
    minWidth: 360,
    maxWidth: 360,
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