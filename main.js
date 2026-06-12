const { app, BrowserWindow, ipcMain } = require('electron');
const { Worker } = require('worker_threads');
const path = require('path');
const { exec } = require('child_process');

// 1. Ignore SSL/Certificate errors globally at the engine level before app is ready
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
  let keycode;
  if (command === 'next') keycode = 176;     // Windows Media Next Track Key
  if (command === 'prev') keycode = 177;     // Windows Media Prev Track Key
  if (command === 'toggle') keycode = 179;   // Windows Media Play/Pause Key

  if (keycode) {
    exec(`powershell -command "(New-Object -ComObject WScript.Shell).SendKeys([char]${keycode})"`);
  }
});

// --- ELECTRON WINDOW ---
function createWidget() {
  widget = new BrowserWindow({
    width: 350,
    height: 150,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // 2. Allow insecure content and disable strict web security for local widget/placeholder assets
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