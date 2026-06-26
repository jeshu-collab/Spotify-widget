const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Worker } = require('worker_threads');
const loudness = require('loudness');
// ADDED: Required to send hardware media key commands to Windows
const { exec } = require('child_process');

let widget;

function createWidget() {
  widget = new BrowserWindow({
    width: 350, // <-- 1. Change this to 350
    height: 150,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    icon: path.join(__dirname, 'tray-icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  widget.loadFile('index.html');
}

// --- 1. NEW: INSTANT MEDIA CONTROLS BRIDGE ---
const fs = require('fs');
const os = require('os');

// 1. Create a lightning-fast script in the Windows Temp folder on startup
const vbsPath = path.join(os.tmpdir(), 'fast-media-keys.vbs');

// We only write the file if it doesn't already exist
if (!fs.existsSync(vbsPath)) {
  fs.writeFileSync(vbsPath, `
    Set ws = CreateObject("WScript.Shell")
    Select Case WScript.Arguments(0)
      Case "toggle" ws.SendKeys(chr(179))
      Case "next" ws.SendKeys(chr(176))
      Case "prev" ws.SendKeys(chr(177))
    End Select
  `);
}

// 2. Listen for clicks and fire the script instantly
ipcMain.on('media-command', (event, cmd) => {
  // wscript.exe runs silently in the background in ~30ms
  exec(`wscript.exe "${vbsPath}" ${cmd}`);
});

// --- 2. NEW: LYRICS WINDOW RESIZER ---
// This physically expands the invisible desktop window so your lyrics aren't cut off

// --- LYRICS WINDOW RESIZER (MIN/MAX BOUNDARY FIX) ---
ipcMain.on('toggle-lyrics-window', (event, isOpen) => {
  if (!widget) return;

  if (isOpen) {
    // 1. Raise the ceiling to allow growth
    widget.setMaximumSize(350, 350);
    // 2. Expand the window
    widget.setBounds({ width: 350, height: 350 });
    // 3. Raise the floor to lock it open
    widget.setMinimumSize(350, 350);
  } else {
    // 1. Lower the floor to allow shrinking
    widget.setMinimumSize(350, 150);
    // 2. Shrink the window
    widget.setBounds({ width: 350, height: 150 });
    // 3. Lower the ceiling to lock it closed
    widget.setMaximumSize(350, 150);
  }
});

// --- FLAWLESS ANDROID VOLUME ENGINE ---
ipcMain.handle('get-system-volume', async () => {
  try { return await loudness.getVolume(); }
  catch (err) { return 50; }
});

ipcMain.on('change-volume', async (event, data) => {
  if (!data || data.value === undefined) return;
  try { await loudness.setVolume(data.value); }
  catch (error) { console.error("Volume Error:", error); }
});

// --- NATIVE MEDIA TRACKER ---
function startMediaTracker() {
  let workerPath = path.join(__dirname, 'media-worker.js');

  // Jailbreak: Look in the unpacked folder when running the .exe
  if (workerPath.includes('app.asar')) {
    workerPath = workerPath.replace('app.asar', 'app.asar.unpacked');
  }

  const worker = new Worker(workerPath, { env: process.env });

  worker.on('message', (trackInfo) => {
    if (widget) widget.webContents.send('update-track', trackInfo);
  });

  worker.on('error', (err) => console.error('Worker crashed:', err));
}

app.whenReady().then(() => {
  createWidget();
  startMediaTracker();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});