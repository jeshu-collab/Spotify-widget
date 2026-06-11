const { app, BrowserWindow } = require('electron');
const { Worker } = require('worker_threads');
const path = require('path');

let widget;

// --- MULTITHREADED ENGINE ---
function startMediaTracker() {
  // Fire up the background worker
  const worker = new Worker(path.join(__dirname, 'media-worker.js'));
  
  // Whenever the worker shouts "I found a song!", send it to the widget
  worker.on('message', (trackInfo) => {
    if (widget) widget.webContents.send('update-track', trackInfo);
  });

  worker.on('error', (err) => {
    console.error('Worker crashed:', err);
  });
}

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
      contextIsolation: false
    }
  });

  widget.loadFile('index.html');
  widget.center(); 
  
  startMediaTracker();
}

app.whenReady().then(createWidget);
app.on('window-all-closed', () => { app.quit(); });