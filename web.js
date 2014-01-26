// web.js
var express = require("express");
var http = require('http');
var path = require('path');

var logfmt = require("logfmt");

var mongo = require('mongodb');

var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost/mydb';

// mongo.Db.connect(mongoUri, function (err, db) {
//   db.collection('mydocs', function(er, collection) {
//     collection.insert({'mykey': 'myvalue'}, {safe: true}, function(er,rs) {
//     });
//   });
// });

var app = express();

app.use(logfmt.requestLogger());

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var announcements_db; // for scoping?

app.get('/', function(req, res) {
  announcements_db.find().toArray(function(err, docs) {
    // TODO: put the filter in find(), where it belongs
    res.render('index', { announcements: docs.filter(function(ann) { return ann.status == 'visible'; }) });
  });
  
});

app.get('/admin', function(req, res) {
  // first, if we have a toggle, do that
  if (req.query.toggle) {
    console.log("Toggling element " + req.query.toggle + " to " + req.query.to);
    announcements_db.update({_id: mongo.ObjectID.createFromHexString(req.query.toggle)}, 
      {$set: {status: req.query.to}},
      function(err, doc) {
        if (err) throw(err);
        console.log(doc);
      })
  }
	announcements_db.find().toArray(function(err, docs) {
    res.render('admin', { announcements: docs.filter(function(ann) { 
      return ['queued', 'visible'].indexOf(ann.status) > -1; }) });
  });
})


mongo.Db.connect(mongoUri, function (err, db) {
	announcements_db = db.collection('announcements');
	console.log("Connected to MongoDB");
	app.listen(app.get('port'), function() {
	  console.log("Listening on " + app.get('port'));
	});	
});
