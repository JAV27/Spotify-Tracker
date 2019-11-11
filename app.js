/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
const async = require('async');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var SpotifyWebApi = require('spotify-web-api-node');

const port = process.env.PORT || 8888;
var client_id = process.env.CLIENT_ID; // Your client id
var client_secret = process.env.CLIENT_SECRET; // Your secret
var redirect_uri = process.env.REDIRECT_URI; // Your redirect uri

let spotifyApi = new SpotifyWebApi({
  clientId: client_id,
  clientSecret: client_secret,
  redirectUri: redirect_uri
});

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

let getData = function(token) {
  console.log(token); 
}

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.use(express.static(__dirname + '/public'));

app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-top-read user-read-recently-played ';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/main?access_token=' + access_token + '&refresh_token=' + refresh_token);
        // res.redirect('/main#' +
        //   querystring.stringify({
        //     access_token: access_token,
        //     refresh_token: refresh_token
        //   }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/main', function(req, res) {
  
  spotifyApi.setAccessToken(req.query.access_token);

  let currDate = new Date();
  let dateInSeconds = currDate.getTime();

  function httpGet(url, callback) {
    const options = {
      url :  url,
      headers: { 'Authorization': 'Bearer ' + req.query.access_token },
      json : true
    };

    request(options,
      function(err, res, body) {
        callback(err, body);
      }
    );
  }

  const urls = [
    'https://api.spotify.com/v1/me',
    'https://api.spotify.com/v1/me/player/recently-played?type=track&limit=50&before=' + dateInSeconds,
    'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50&offset=0',
    'https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=50&offset=0',
    'https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50&offset=0',
    'https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=50&offset=0',
    'https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=50&offset=0',
    'https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=50&offset=0',
    'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50&offset=49',
  ];

  async.map(urls, httpGet, function(err, resp) {
    if (err) return console.log(err);

    let display_name = resp[0].display_name;
    // let picture = resp[0].images[0].url;

    let recentTracks = resp[1].items.map((i) => {
      return {
        name: i.track.name,
        imageUrl: i.track.album.images[0]
      };
    });

    let topTracksShort = resp[2].items.map((i) => {
      return {
        name: i.name,
        imageUrl: i.album.images[0].url
      };
    });

    let topTracksMedium = resp[3].items.map((i) => {
      return {
        name: i.name,
        imageUrl: i.album.images[0].url
      };
    });

    let topTracksLong = resp[4].items.map((i) => {
      return {
        name: i.name,
        imageUrl: i.album.images[0].url
      };
    });

    let topArtistsShort = resp[5].items.map((i) => {
      return {
        name: i.name,
        imageUrl: i.images[0].url
      };
    });

    let topArtistsMedium = resp[6].items.map((i) => {
      return {
        name: i.name,
        imageUrl: i.images[0].url
      };
    });

    let topArtistsLong = resp[7].items.map((i) => {
      return {
        name: i.name,
        imageUrl: i.images[0].url
      };
    });

    let offset = resp[8].items.map((i) => {
      console.log(i.name);
    });

    res.render('main', {
      display_name: display_name,
      recentTracks: recentTracks,
      topTracksShort: topTracksShort,
      topTracksMedium: topTracksMedium,
      topTracksLong: topTracksLong,
      topArtistsShort: topArtistsShort,
      topArtistsMedium: topArtistsMedium,
      topArtistsLong: topArtistsLong
    });
  });  

});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(port);
