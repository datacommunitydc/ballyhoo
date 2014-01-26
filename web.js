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
var flash = require('connect-flash');

app.use(logfmt.requestLogger());

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({secret: "MQ4MNOIq1Uv3dVIuxmvi", cookie: { maxAge: 60000 }}));
app.use(flash());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var announcements_db; // for scoping?

app.get('/', function(req, res) {
  announcements_db.find().toArray(function(err, docs) {
    // TODO: put the filter in find(), where it belongs
    res.render('index', { announcements: docs.filter(function(ann) { return ann.status == 'visible'; }),
      messages: req.flash('info'), warnings: req.flash('info')});
  });
  
});

app.get('/validate', function(req, res) {
  // if we don't have an id, redirect to / with an error message
  // if we have a valid id, validate it, then redirect to / with a success message
  // if we don't have a valid id, redirect to / with an error message
  if (req.query.id) {
    console.log("queueing " + req.query.id);
    req.flash('info', 'Announcement queued successfully!');
  } else {
    console.log("warning");
    req.flash('warning', 'Invalid validation request?!');
  };
  res.redirect("/");
});

app.get('/admin', function(req, res) {
  // first, if we have a toggle, do that
  if (req.query.toggle) {
    console.log("Toggling element " + req.query.toggle + " to " + req.query.to);
    announcements_db.update({_id: mongo.ObjectID.createFromHexString(req.query.toggle)}, 
      {$set: {status: req.query.to}}, 
      function(err, doc) {
        if (err) throw(err);
      })
  };
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
