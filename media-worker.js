const { parentPort } = require('worker_threads');
const { SMTCMonitor } = require('@coooookies/windows-smtc-monitor');

// Baked-in Offline Image (prevents internet network crashes)
const OFFLINE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkAQMAAABpTeRvAAAABlBMVEUAAAD///+l2Z/dAAAAAXRSTlMAQObYZgAAABxJREFUeJztwQENAAAAwqD3P20ON6AAAAAAAADg1w1vAAABa9e6YAAAAABJRU5ErkJggg==';

setInterval(() => {
  try {
    const session = SMTCMonitor.getCurrentMediaSession();
    
    // 1. If NO session exists at all, reset to sleep state.
    if (!session) {
      parentPort.postMessage({ title: "Waiting for Spotify...", artist: "Play a song!", albumArt: OFFLINE_IMAGE, progress: 0, duration: 1, isPlaying: false });
      return;
    }

    // 2. The Ironclad Filter Logic
    const appId = session.sourceAppUserModelId ? session.sourceAppUserModelId.toLowerCase() : "";
    const hasSpotifyId = appId.includes('spotify');
    const hasMedia = session.media && (session.media.title || session.media.artist);
    
    // Only block if we HAVE an AppID and we know for sure it is NOT Spotify
    if (appId !== "" && !hasSpotifyId) {
      parentPort.postMessage({ title: "Waiting for Spotify...", artist: "Play a song!", albumArt: OFFLINE_IMAGE, progress: 0, duration: 1, isPlaying: false });
      return;
    }

    // 3. Valid Session! Beam data to the UI
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
        // Multiply by 1000 to convert seconds to milliseconds for our UI timer
        progress: session.timeline ? Math.floor(session.timeline.position * 1000) : 0,
        duration: session.timeline ? Math.floor(session.timeline.duration * 1000) : 1000,
        isPlaying: session.playback ? session.playback.playbackStatus === 4 : false
      });
    }
  } catch (err) {
    // Silence errors to keep the background loop running smoothly
  }
}, 500);