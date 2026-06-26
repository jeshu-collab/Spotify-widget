const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const loudness = require('loudness');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const { Worker } = require('worker_threads'); // <-- Added the Worker requirement

let widget;

function createWidget() {
  widget = new BrowserWindow({
    width: 350,
    height: 150,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    icon: path.join(__dirname, 'installer-icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  widget.loadFile('index.html');
}

// --- 1. INSTANT MEDIA CONTROLS BRIDGE (VBScript is perfect here) ---
const vbsPath = path.join(os.tmpdir(), 'fast-media-keys.vbs');
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

ipcMain.on('media-command', (event, cmd) => {
  exec(`wscript.exe "${vbsPath}" ${cmd}`);
});

// --- 2. LYRICS WINDOW RESIZER (MIN/MAX BOUNDARY FIX) ---
ipcMain.on('toggle-lyrics-window', (event, isOpen) => {
  if (!widget) return;
  if (isOpen) {
    widget.setMaximumSize(350, 350);
    widget.setBounds({ width: 350, height: 350 });
    widget.setMinimumSize(350, 350);
  } else {
    widget.setMinimumSize(350, 150);
    widget.setBounds({ width: 350, height: 150 });
    widget.setMaximumSize(350, 150);
  }
});

// --- 3. FLAWLESS ANDROID VOLUME ENGINE ---
ipcMain.handle('get-system-volume', async () => {
  try { return await loudness.getVolume(); }
  catch (err) { return 50; }
});

ipcMain.on('change-volume', async (event, data) => {
  if (!data || data.value === undefined) return;
  try { await loudness.setVolume(data.value); }
  catch (error) { console.error("Volume Error:", error); }
});

// --- 4. DECOUPLED NATIVE MEDIA TRACKER (Uses Worker) ---
function startMediaTracker() {
  let workerPath = path.join(__dirname, 'media-worker.js');

  // Jailbreak: Look in the unpacked folder when running the .exe
  if (app.isPackaged) {
    workerPath = workerPath.replace('app.asar', 'app.asar.unpacked');
  }

  const worker = new Worker(workerPath);

  worker.on('message', (trackInfo) => {
    if (widget) widget.webContents.send('update-track', trackInfo);
  });

  worker.on('error', (err) => console.error('Worker crashed:', err));
}

// --- APP BOOT SEQUENCE ---
app.whenReady().then(() => {
  createWidget();
  startMediaTracker();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});