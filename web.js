// web.js
var express = require("express");
var http = require('http');
var path = require('path');

var logfmt = require("logfmt");

var mongo = require('mongodb');

var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost/mydb';

var meetupName = process.env.MEETUP_NAME || "";
var appName = "Ballyhoo" + (meetupName != "" ? (": " + meetupName) : "");

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
app.use(express.bodyParser());
app.use(express.session({secret: "MQ4MNOIq1Uv3dVIuxmvi", cookie: { maxAge: 60000 }}));
app.use(flash());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var server = http.createServer(app);
var io = require('socket.io').listen(server);
io.set('log level', 2);

var announcements_db; // for scoping?

app.get('/', function(req, res) {
  announcements_db.find().toArray(function(err, docs) {
    // TODO: put the filter in find(), where it belongs
    res.render('index', { announcements: docs.filter(function(ann) { return ann.status == 'visible'; }),
      messages: req.flash('info'), 
      warnings: req.flash('info'),
      title: appName});
  });
  
});

app.get('/about', function(req, res) {
  res.render('about', {title: "About Ballyhoo"});
});

app.post('/email', function(req, res) {
  // get username and announcement from the Subject
  // get userurl from the email body
  // get url from the email body
  // get email from the Reply-To
  // get image_url from the HTML body, looking for "photos/member" in a URL, replacing "thumb_" w/ "member_"
  // for now, status is queued
  var subj_re = /(.+) sent you a message: (.+)/;
  var subj_match = req.body.Subject.match(subj_re);
  //console.log(subj_match);
  var url_re = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
  var userurl_re = new RegExp("http://www.meetup.com/[^/]+/members/\\d+", "i");
  var photo_re = new RegExp("http://photo[^.]*.meetupstatic.com/photos/member/[^.]+.jpeg", "i");
  if (subj_match) {
    var annc = {
      username: subj_match[1],
      announcement: subj_match[2],
      url: req.body.TextBody.match(url_re)[0],
      email: req.body.ReplyTo,
      userurl: req.body.TextBody.match(userurl_re)[0],
      image_url: req.body.HtmlBody.match(photo_re)[0].replace("thumb_", "member_"),
      status: "queued"
    };
    // write to the db
    announcements_db.insert(annc, function(er,rs) {
        if(er) throw er;
    });
    console.log("Inserted announcement from ", annc.username);
  } else {
    // forward
    //log
    console.log("Received email, but doesn't seem to be an announcement: ", req.body.Subject);
  };
  
  // console.log(req.body.Subject);
  // console.log(req.body.TextBody);
  res.send(200);
});

app.get('/validate', function(req, res) {
  // if we don't have an id, redirect to / with an error message
  // if we have a valid id, validate it, then redirect to / with a success message
  // if we don't have a valid id, redirect to / with an error message
  if (req.query.id) {
    var idstr = mongo.ObjectID.createFromHexString(req.query.id);
    announcements_db.findOne({ _id: idstr }, function(err, doc) {
      if (err || doc == null) {
        req.flash('warning', 'Invalid validation ID!');
        console.log("invalid validation id!");
      } else {
        console.log("queueing " + idstr);
        announcements_db.update({ _id: idstr }, 
          {$set: {status: "queued"}}, 
          function(err, doc) {
            if (err || doc == null) {
              req.flash('warning', 'Announce queueing failed?!');
              console.log("failed! " + err + doc);
            } else {
              req.flash('info', 'Announcement queued successfully!');
              console.log("succeeded")
            }
          }
        );
      }
    });
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
        io.sockets.emit('reload', req.query.toggle + " to " + req.query.to);
      })
  };
	announcements_db.find().toArray(function(err, docs) {
    res.render('admin', { announcements: docs.filter(function(ann) { 
      return ['queued', 'visible'].indexOf(ann.status) > -1; }),
      title: "Ballyhoo Admin" });
  });
})

mongo.Db.connect(mongoUri, function (err, db) {
	announcements_db = db.collection('announcements');
	console.log("Connected to MongoDB");
	server.listen(app.get('port'), function() {
	  console.log("Listening on " + app.get('port'));
	});
  io.sockets.on('connection', function (sckt) {
    console.log("socket.io connected");
    //socket.emit('update', 'connected');
  });
});
