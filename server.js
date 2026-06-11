const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();

// --- PASTE YOUR KEYS HERE ---
const spotifyApi = new SpotifyWebApi({
  clientId: '4bfdd0d1f20e4816bfb737f3ca75f219',
  clientSecret: 'f72b6e2641fd45b5ae0316ae8310560a',
  redirectUri: 'http://127.0.0.1:8888/callback'
});
// ----------------------------

// We are asking Spotify for permission to read what is currently playing
const scopes = ['user-read-currently-playing', 'user-read-playback-state'];

// 1. This creates the login link
app.get('/login', (req, res) => {
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

// 2. This catches you after you log in and grabs your access token
app.get('/callback', (req, res) => {
  const code = req.query.code;

  spotifyApi.authorizationCodeGrant(code).then(data => {
    // Save the tokens!
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);

    console.log('\n✅ Successfully logged into Spotify!');
    res.send('Success! You can close this browser window and look at your terminal.');

    // 3. The Heartbeat: Check what song is playing every 3 seconds
    setInterval(() => {
      spotifyApi.getMyCurrentPlayingTrack().then(data => {
        if (data.body && data.body.item) {
          const songName = data.body.item.name;
          const artistName = data.body.item.artists[0].name;
          console.log(`🎵 Now Playing: ${songName} by ${artistName}`);
        } else {
          console.log('⏸️ Nothing is currently playing.');
        }
      }).catch(err => console.log('Error fetching track:', err));
    }, 3000); 

  }).catch(error => {
    console.error('Error getting Tokens:', error);
    res.send(`Error getting Tokens: ${error}`);
  });
});

// Start the local server
app.listen(8888, () => {
  console.log('🚀 Spotify Engine is running!');
  console.log('👉 Open this link in your browser to connect: http://localhost:8888/login');
});