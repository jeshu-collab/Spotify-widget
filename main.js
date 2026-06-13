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
ipcMain.on('media-command', (event, command) => {
  const scriptPath = path.join(__dirname, 'media-keys.vbs');
  exec(`cscript //nologo "${scriptPath}" ${command}`, (error) => {
    if (error) console.error("Key press failed:", error);
  });
});

// --- NEW: DYNAMIC WINDOW RESIZING ---
ipcMain.on('toggle-lyrics-window', (event, isExpanding) => {
  if (!widget) return;
  
  const currentBounds = widget.getBounds();
  
  if (isExpanding) {
    widget.setBounds({ width: currentBounds.width, height: 300 });
  } else {
    // FIXED: Shrunk back down to 140 instead of 150 to match your perfect padding!
    widget.setBounds({ width: currentBounds.width, height: 140 }); 
  }
});

// --- ELECTRON WINDOW ---
function createWidget() {
  widget = new BrowserWindow({
    width: 350,
    height: 140, 
    minWidth: 300,
    minHeight: 120,
    maxWidth: 500,   
    maxHeight: 400,
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
  
  // THE MAGIC DEBUGGER: Forces the DevTools console to pop open!
 // widget.webContents.openDevTools({ mode: 'detach' }); 
  
  startMediaTracker();
}

app.whenReady().then(createWidget);

app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') app.quit(); 
});