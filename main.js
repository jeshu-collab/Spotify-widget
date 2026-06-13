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
// --- NEW: DYNAMIC WINDOW RESIZING ---
// --- NEW: DYNAMIC WINDOW RESIZING ---
ipcMain.on('toggle-lyrics-window', (event, isExpanding) => {
  if (!widget) return;
  
  const currentBounds = widget.getBounds();
  
  if (isExpanding) {
    // EXPANDING: Unlock maximum first, grow window, lock minimum
    widget.setMaximumSize(500, 300);
    widget.setBounds({ width: currentBounds.width, height: 300 });
    widget.setMinimumSize(300, 300);
  } else {
    // SHRINKING: Unlock minimum first, shrink window, lock maximum
    widget.setMinimumSize(300, 140); // <-- THE FIX: Unlock the floor first!
    widget.setBounds({ width: currentBounds.width, height: 140 }); 
    widget.setMaximumSize(500, 140); 
  }
});

// --- ELECTRON WINDOW ---
function createWidget() {
  widget = new BrowserWindow({
    width: 350,
    height: 140, 
    
    // THE RAILROAD TRACKS: 
    // Width can stretch between 300 and 500
    minWidth: 300,   
    maxWidth: 500,   
    
    // Height is strictly locked at 140 so you can't drag it up, down, or diagonally!
    minHeight: 140,  
    maxHeight: 140,  
    
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true, // Turned back on so the left/right dragging works!
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  widget.loadFile('index.html');
  startMediaTracker();
}

app.whenReady().then(createWidget);

app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') app.quit(); 
});