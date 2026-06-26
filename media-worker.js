const path = require('path');

// --- FORCE NATIVE PATH RESOLUTION ---
let monitorPath = '@coooookies/windows-smtc-monitor';
try {
  const isPackaged = process.mainModule && process.mainModule.filename.includes('app.asar');
  if (isPackaged && process.resourcesPath) {
    monitorPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@coooookies', 'windows-smtc-monitor');
  }
} catch (e) {
  console.error("Path resolution error", e);
}

const { SMTCMonitor } = require(monitorPath);
const { parentPort } = require('worker_threads');

// Baked-in Offline Image
const OFFLINE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkAQMAAABpTeRvAAAABlBMVEUAAAD///+l2Z/dAAAAAXRSTlMAQObYZgAAABxJREFUeJztwQENAAAAwqD3P20ON6AAAAAAAADg1w1vAAABa9e6YAAAAABJRU5ErkJggg==';

setInterval(() => {
  try {
    const session = SMTCMonitor.getCurrentMediaSession();

    if (!session) {
      parentPort.postMessage({ title: "Waiting for Media...", artist: "Play a song!", albumArt: OFFLINE_IMAGE, progress: 0, duration: 1, isPlaying: false });
      return;
    }

    const appId = session.sourceAppUserModelId ? session.sourceAppUserModelId.toLowerCase() : "";
    const hasSpotifyId = appId.includes('spotify');
    const hasMedia = session.media && (session.media.title || session.media.artist);

    if (appId !== "" && !hasSpotifyId) {
      parentPort.postMessage({ title: "Waiting for Media...", artist: "Play a song!", albumArt: OFFLINE_IMAGE, progress: 0, duration: 1, isPlaying: false });
      return;
    }

    if (hasMedia) {
      let coverArt = OFFLINE_IMAGE;
      if (session.media.thumbnail) {
        const base64Image = session.media.thumbnail.toString('base64');
        coverArt = `data:image/jpeg;base64,${base64Image}`;
      }

      parentPort.postMessage({
        title: session.media.title || "Unknown Title",
        artist: session.media.artist || "Unknown Artist",
        albumArt: coverArt,
        progress: session.timeline ? Math.floor(session.timeline.position * 1000) : 0,
        duration: session.timeline ? Math.floor(session.timeline.duration * 1000) : 1000,
        isPlaying: session.playback ? session.playback.playbackStatus === 4 : false
      });
    }
  } catch (err) { }
}, 500);