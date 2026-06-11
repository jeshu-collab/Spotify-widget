const { parentPort } = require('worker_threads');
const { SMTCMonitor } = require('@coooookies/windows-smtc-monitor');

// This loops forever in the background, totally invisible to the main app!
setInterval(() => {
  try {
    const session = SMTCMonitor.getCurrentMediaSession();
    
    if (session && session.media) {
      let coverArt = 'https://via.placeholder.com/100';
      if (session.media.thumbnail) {
        const base64Image = session.media.thumbnail.toString('base64');
        coverArt = `data:image/jpeg;base64,${base64Image}`;
      }

      const trackInfo = {
        title: session.media.title || "Unknown Title",
        artist: session.media.artist || "Unknown Artist",
        albumArt: coverArt,
        progress: session.timeline ? session.timeline.position : 0, 
        duration: session.timeline ? session.timeline.duration : 1
      };
      
      // Beam the formatted data back to main.js
      parentPort.postMessage(trackInfo);
    }
  } catch (err) {
    // Silently ignore errors so the worker doesn't crash
  }
}, 1000);