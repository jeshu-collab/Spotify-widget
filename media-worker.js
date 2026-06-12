const { parentPort } = require('worker_threads');
const { SMTCMonitor } = require('@coooookies/windows-smtc-monitor');

const OFFLINE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkAQMAAABpTeRvAAAABlBMVEUAAAD///+l2Z/dAAAAAXRSTlMAQObYZgAAABxJREFUeJztwQENAAAAwqD3P20ON6AAAAAAAADg1w1vAAABa9e6YAAAAABJRU5ErkJggg==';

setInterval(() => {
  try {
    const session = SMTCMonitor.getCurrentMediaSession();
    
    // 1. If NO session exists at all, reset.
    if (!session) {
      parentPort.postMessage({ title: "Waiting for Spotify...", artist: "Play a song!", albumArt: OFFLINE_IMAGE, progress: 0, duration: 1, isPlaying: false });
      return;
    }

    // 2. Logic: If we have an AppID and it's NOT Spotify, ignore it.
    // If we have NO AppID (undefined), but we DO have a song title, proceed!
    const appId = session.sourceAppUserModelId ? session.sourceAppUserModelId.toLowerCase() : "";
    const hasSpotifyId = appId.includes('spotify');
    const hasMedia = session.media && (session.media.title || session.media.artist);
    
    // Only block if we HAVE an AppID and it is NOT Spotify
    if (appId !== "" && !hasSpotifyId) {
      parentPort.postMessage({ title: "Waiting for Spotify...", artist: "Play a song!", albumArt: OFFLINE_IMAGE, progress: 0, duration: 1, isPlaying: false });
      return;
    }

    // 3. If we are here, we have a valid session!
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
        progress: session.timeline ? session.timeline.position / 10000 : 0,
        duration: session.timeline ? session.timeline.duration / 10000 : 1,
        isPlaying: session.playbackInfo ? session.playbackInfo.playbackStatus === 4 : true
      });
    }
  } catch (err) {
    // Silence errors
  }
}, 500);