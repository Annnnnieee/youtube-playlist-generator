let cheerio = require('cheerio');
let jsonframe = require('jsonframe-cheerio');
var request = require('request');
var Song = require('./song');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/album');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("connected");
});

console.log("trying to scrape...");
getSongsWithYears();

function getSongsWithYears(){
    for(var year = 1946; year < 2017; year++){
        getSongs(year);
    }
}

function getSongs(year){
    request('http://www.bobborst.com/popculture/top-100-songs-of-the-year/?year=' + year, function (error, response, body) {
        if (!error && response.statusCode == 200) {
    
            let $ = cheerio.load(body);
            jsonframe($);

            let frame = {
                "songs":{
                    _s: "tr",
                    _d: [{
                        "artist": "td:nth-child(2)",
                        "song": "td:nth-child(3)"
                    }]
                }
            }
            console.log("scraping the year of: " + year);
            
            const result  =JSON.parse($('tbody').scrape(frame, { string: true } ));
            processSongs(year, result.songs);
        }
    })
};


function processSongs(year, songs){
    songs.forEach(function(song){
        Song.create({"artist": song.artist, "name": song.song, "year": year}, function (err, song) {
            if (err) console.log(err);
            console.log("saved song: " + song)
        })
    })

}