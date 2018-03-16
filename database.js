var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/album');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("connected");
});

let songSchema = mongoose.Schema({
  artist: String,
  name: String,
  year: Number
});

const Song = mongoose.model('song', songSchema);

let song1 = new Song({artist: "temporex", name: "hard poop"});
