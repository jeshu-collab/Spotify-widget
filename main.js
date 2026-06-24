const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const { Worker } = require('worker_threads');
const path = require('path');
const { exec } = require('child_process');

// 1. Core Engine Switches
app.commandLine.appendSwitch('ignore-certificate-errors');

// ALL GLOBAL VARIABLE DECLARATIONS FIXED (NO DUPLICATES)
let widget;
let tray = null;
let currentBaseVolume = 50;

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

// --- NATIVE CONTROLS RECEIVER ---
ipcMain.on('media-command', (event, command) => {
  let scriptPath = path.join(__dirname, 'media-keys.vbs');

  if (scriptPath.includes('app.asar')) {
    scriptPath = scriptPath.replace('app.asar', 'app.asar.unpacked');
  }

  exec(`cscript //nologo "${scriptPath}" ${command}`, (error) => {
    if (error) console.error("Key press failed:", error);
  });
});

// --- WIN32 HIGH-STABILITY ACCESSIBILITY AUDIO DISPATCH ---
ipcMain.on('change-volume', (event, data) => {
  if (!data || data.value === undefined) return;

  if (data.value === currentBaseVolume) return;
  const commandDirection = data.value > currentBaseVolume ? '175' : '174';
  currentBaseVolume = data.value;

  const runCmd = `powershell -NoProfile -Command "(New-Object -ComObject Wscript.Shell).SendKeys([char]${commandDirection})"`;
  exec(runCmd, (error) => {
    if (error) console.error("Volume execution failure:", error);
  });
});

// --- DYNAMIC SLIDER POPOUT CANVAS EXPANSION MANAGEMENT ---
ipcMain.on('toggle-volume-frame', (event, isExpanding) => {
  if (!widget) return;
  const bounds = widget.getBounds();
  if (isExpanding) {
    widget.setBounds({ width: 450, height: 140, x: bounds.x, y: bounds.y });
  } else {
    widget.setBounds({ width: 400, height: 140, x: bounds.x, y: bounds.y });
  }
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

// --- MAIN PROJECT WINDOW & SYSTEM TRAY BUILDER ---
function createWidget() {
  widget = new BrowserWindow({
    width: 350,
    height: 140,
    minWidth: 350,
    maxWidth: 400,
    minHeight: 140,
    maxHeight: 140,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  widget.loadFile('index.html');
  startMediaTracker();

  // SYSTEM TRAY IMPLEMENTATION (SAFE INSIDE STARTUP CYCLE)
  const iconPath = path.join(__dirname, 'tray-icon.ico');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Widget',
      click: () => widget.show()
    },
    {
      label: 'Hide Widget',
      click: () => widget.hide()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Spotify Glass Widget');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (widget.isVisible()) {
      widget.hide();
    } else {
      widget.show();
    }
  });

  widget.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      widget.hide();
    }
    return false;
  });
}

// App Lifecycles
app.whenReady().then(createWidget);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});