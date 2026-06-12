const { app, BrowserWindow, ipcMain } = require('electron');
const { Worker } = require('worker_threads');
const path = require('path');
const { exec } = require('child_process');

// 1. Ignore SSL/Certificate errors globally at the engine level
app.commandLine.appendSwitch('ignore-certificate-errors');

let widget;

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
// --- NATIVE CONTROLS RECEIVER ---
ipcMain.on('media-command', (event, command) => {
  // We use cscript to run the VBS file invisibly. It takes roughly ~50ms instead of 2000ms!
  const scriptPath = path.join(__dirname, 'media-keys.vbs');
  exec(`cscript //nologo "${scriptPath}" ${command}`, (error) => {
    if (error) console.error("Key press failed:", error);
  });
});

// --- ELECTRON WINDOW ---
function createWidget() {
  widget = new BrowserWindow({
    width: 350,
    height: 150,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false, // THE FIX: Locks the window so the UI can't shatter
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  widget.loadFile('index.html');
  widget.center(); 
  startMediaTracker();
}

app.whenReady().then(createWidget);

app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') app.quit(); 
});