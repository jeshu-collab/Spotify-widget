require('dotenv').config();
const { app, BrowserWindow } = require('electron');
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');

let widget;

// --- SPOTIFY ENGINE ---
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: 'http://127.0.0.1:8888/callback'
});

// I added 'user-read-email' and 'user-read-private' here so we can interrogate the app
const scopes = ['user-read-currently-playing', 'user-read-playback-state', 'user-read-email', 'user-read-private'];

const serverApp = express();

serverApp.get('/login', (req, res) => {
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

serverApp.get('/callback', (req, res) => {
  const code = req.query.code;
  spotifyApi.authorizationCodeGrant(code).then(data => {
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);
    
    // === THE INTERROGATION CHECK ===
    spotifyApi.getMe().then(function(meData) {
      console.log('\n=== SECURITY CHECK ===');
      console.log('Logged in as: ' + meData.body.display_name);
      console.log('Email: ' + meData.body.email);
      console.log('Account type: ' + meData.body.product);
      console.log('======================\n');
    }).catch(err => console.log('Error getting user:', err));
    // ===============================

    res.send('Success! You can close this browser window and enjoy your widget.');
    
    // The Heartbeat
    setInterval(() => {
      spotifyApi.getMyCurrentPlayingTrack().then(data => {
        if (data.body && data.body.item) {
          const trackInfo = {
            title: data.body.item.name,
            artist: data.body.item.artists[0].name,
            albumArt: data.body.item.album.images[0].url,
            progress: data.body.progress_ms,
            duration: data.body.item.duration_ms
          };
          
          if (widget) widget.webContents.send('update-track', trackInfo);
        }
      }).catch(err => {
          // This will tell us if it's still throwing the 403 error
          console.log('\n❌ Fetch error! Spotify says:', err.statusCode); 
      });
    }, 2000);

  }).catch(err => res.send('Error: ' + err));
});

serverApp.listen(8888, () => {
  console.log('Engine running! Go to http://127.0.0.1:8888/login');
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
      contextIsolation: false
    }
  });

  widget.loadFile('index.html');
  widget.center();
}

app.whenReady().then(createWidget);
app.on('window-all-closed', () => { app.quit(); });