var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

var Song = require('./song');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/album');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("connected");
});

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
//var SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
var SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 
'https://www.googleapis.com/auth/youtube', 
'https://www.googleapis.com/auth/youtubepartner',
'https://www.googleapis.com/auth/plus.login',
'https://www.googleapis.com/auth/userinfo.email'];

var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
    console.log(TOKEN_DIR);
var TOKEN_PATH = TOKEN_DIR + 'youtube-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the YouTube API.
  authorize(JSON.parse(content), songRequestOrchestrator);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function removeEmptyParameters(params) {
  for (var p in params) {
    if (!params[p] || params[p] == 'undefined') {
      delete params[p];
    }
  }
  return params;
}

/**
 * Create a JSON object, representing an API resource, from a list of
 * properties and their values.
 *
 * @param {Object} properties A list of key-value pairs representing resource
 *                            properties and their values.
 * @return {Object} A JSON object. The function nests properties based on
 *                  periods (.) in property names.
 */
function createResource(properties) {
  var resource = {};
  var normalizedProps = properties;
  for (var p in properties) {
    var value = properties[p];
    if (p && p.substr(-2, 2) == '[]') {
      var adjustedName = p.replace('[]', '');
      if (value) {
        normalizedProps[adjustedName] = value.split(',');
      }
      delete normalizedProps[p];
    }
  }
  for (var p in normalizedProps) {
    // Leave properties that don't have values out of inserted resource.
    if (normalizedProps.hasOwnProperty(p) && normalizedProps[p]) {
      var propArray = p.split('.');
      var ref = resource;
      for (var pa = 0; pa < propArray.length; pa++) {
        var key = propArray[pa];
        if (pa == propArray.length - 1) {
          ref[key] = normalizedProps[p];
        } else {
          ref = ref[key] = ref[key] || {};
        }
      }
    };
  }
  return resource;
}



function sleep() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved');
    }, 1000);
  });
}

async function songRequestOrchestrator(auth){

  const songs = await getSongs();

  for(let x = 0; x < songs.length; x++){
      findSong(auth, songs[x].artist + " - " + songs[x].name);
      await sleep();
  }
}

function getSongs(){
return new Promise((resolve, reject) => {
  const songs = [];
  var cursor = Song.find({ year: 2016 }).limit(3).cursor();
  cursor.on('data', async function(song) {
    console.log("sleeping")
    await sleep();
    console.log("not sleeping")
    songs.push({artist: song.artist, name: song.name})
    resolve(songs)
  });
})

}

function findSong(auth, q) {
    var requestData = {'params': {'maxResults': '1',
    'part': 'snippet',
    'fields': 'items(id(videoId),snippet(title))',
    'q': q,
    'type': ''}};
    var service = google.youtube('v3');
    var parameters = removeEmptyParameters(requestData['params']);
    parameters['auth'] = auth;  
   // console.log(JSON.stringify(parameters, null, 4))
    service.search.list(parameters, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      var responseString = JSON.stringify(response.data.items, null, 4)
      const parsed = JSON.parse(responseString);
      console.log("findsongs: " + parsed[0].snippet.title)
      });
    
}

function addSongToPlaylist(auth, {id, snippet}){
  console.log("addSongs: " + snippet.title);
  var requestData = {'params': 
  {'part': 'snippet', 
  'onBehalfOfContentOwner': ''
  }, 
  'properties': 
  {'snippet.playlistId': 'PLy8mnn_ZmevJTla_ergu5PXy5N3HNSmTB',
  'snippet.resourceId.kind': 'youtube#video',
  'snippet.resourceId.videoId': id.videoId,
  'snippet.position': ''
}}
  var service = google.youtube('v3');
  var parameters = removeEmptyParameters(requestData['params']);
  parameters['auth'] = auth;  
  parameters['resource'] = createResource(requestData['properties']);
  service.playlistItems.insert(parameters, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    console.log("added a video to the playlist: " + snippet.title);
  });
}