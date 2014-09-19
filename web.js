var express = require("express");
var passport = require('passport');
var MeetupStrategy = require('passport-meetup').Strategy;
var http = require('http');
var path = require('path');

var MEETUP_KEY = process.env.MEETUP_KEY || console.log("no MEETUP_KEY!");
var MEETUP_SECRET = process.env.MEETUP_SECRET || console.log("no MEETUP_SECRET");

var logfmt = require("logfmt");
var keenReadKey = process.env.KEEN_READ_KEY
var keenWriteKey = process.env.KEEN_WRITE_KEY
var keenProjID = process.env.KEEN_PROJ_ID
var keenClass = require('keen.io');
var keen = keenClass.configure({
    projectId: keenProjID,
    writeKey: keenWriteKey,
    readKey: keenReadKey
});
keen.addEvent("startup");
var keenCountQuery = new keenClass.Query("count", {
  event_collection: "visit_ann_url",
  group_by: "url",
  timeframe: "this_7_days",
  timezone: "-14400"
});
var keenCount;
function keenCountFn() {
  keen.run(keenCountQuery, function(err, response) {
    if (err) return console.log(err);
    keenCount = {};
    var rrLen = response.result.length;
    for (var r=0; r < rrLen; r++) {
      keenCount[response.result[r].url] = response.result[r].result;
    }
    console.log("clickthroughs: " + JSON.stringify(keenCount));
  })
}
// run once at startup...
keenCountFn();
//var keenInterval = setInterval(keenCountFn, 1000*60*60); // get count hourly

var mongo = require('mongodb');

var mongoUri = process.env.MONGOLAB_URI || "MONGOLAB_URI undefined";

var meetupName = process.env.MEETUP_NAME || "MEETUP_NAME undefined";
var appName = "Ballyhoo";
var title = appName + ": " + meetupName;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Meetup profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the MeetupStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and Meetup profile), and
//   invoke a callback with a user object.
passport.use(new MeetupStrategy({
    consumerKey: MEETUP_KEY,
    consumerSecret: MEETUP_SECRET,
    callbackURL: "/auth/meetup/callback"
  },
  function(token, tokenSecret, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Meetup profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Meetup account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));


var app = express();
var flash = require('connect-flash');

var util = require('util');

app.use(logfmt.requestLogger());

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon('public/favicon.ico'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(flash());
app.use(express.session({secret: "MQ4MNOIq1Uv3dVIuxmvi", cookie: { maxAge: 60000 }}));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

var admin_pw = process.env.ADMIN_PW || "";
var auth = express.basicAuth('admin', admin_pw);

var server = http.createServer(app);
var io = require('socket.io').listen(server);
io.set('log level', 2);

var announcements_db; // for scoping?

app.get('/', function(req, res) {
  keenCountFn(); // with a little luck, this'll be done in time for a correct number...
  announcements_db.find({status: 'visible'},
                        {sort: [['modified', -1]]}).toArray(function(err, docs) {
    keen.addEvent("render_page", {"page": "/", "num_docs": docs.length});
    // add counts to docs, by URL
    var arrayLen = docs.length;
    for (var d = 0; d < arrayLen; d++) {
      docs[d].clickthroughs = keenCount[docs[d].url] || "0";
    }
    res.render('index', { announcements: docs,
      messages: req.flash('info'), 
      warnings: req.flash('warning'),
      host: req.protocol + '://' + req.host, // for socket connection
      title: title,
      //announceuri: announceUri,
      keenProjID: keenProjID,
      keenWriteKey: keenWriteKey
    });
  });
  
});

app.get('/about', function(req, res) {
  keen.addEvent("render_page", {"page": "/about"})
  res.render('about', {title: title, page: "about"});
});

app.get('/announce', ensureAuthenticated, function(req, res) {
  keen.addEvent("render_page", {"page": "/announce"})
  var user_info = req.user._json.results[0];
  console.log(user_info);
  res.render('announce', { 
    title: title, page: "announce", 
    membername: user_info.name,
    memberurl: user_info.link,
    memberphotourl: user_info.photo.photo_link || "/yellout.png",
  });
});

app.get('/login', function(req, res){
  res.render('login', {title: title, page: "login", user: req.user });
});

// GET /auth/meetup
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Meetup authentication will involve redirecting
//   the user to meetup.com.  After authorization, Meetup will redirect the user
//   back to this application at /auth/meetup/callback
app.get('/auth/meetup',
  passport.authenticate('meetup'),
  function(req, res){
    // The request will be redirected to Meetup for authentication, so this
    // function will not be called.
  });

// GET /auth/meetup/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/meetup/callback', 
  passport.authenticate('meetup', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/announce');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// this receives the form for the announcement.
// 1. validate and store it
// 2. set up a flash message
// 3. redirect to /
app.post('/submit', function(req, res) {
  console.log(req.body);
  // TODO: validation!
  var annc = {
    username: req.body.membername,
    announcement: req.body.announcement,
    url: req.body.url,
    userurl: req.body.memberurl,
    image_url: req.body.memberphotourl,
    status: "queued"
  };
  keen.addEvent("announcement_submitted", annc);

  announcements_db.insert(annc, function(er,rs) {
    if(er) {
      req.flash('warning', 'Announce queueing failed?!');
      console.log("failed! " + er + rs);
    } else {
      req.flash('info', 'Announcement queued! Next step: Attend the Meetup and say your piece!');
      io.sockets.emit('queued', rs[0]._id + " to queued");
      console.log("succeeded");
    }
  });
  
  res.redirect("/");
});

function render_admin(req, res) {
  // TODO: move the filter into the find(), and use a regex instead of indexOf
  announcements_db.find().toArray(function(err, docs) {
    res.render('admin', { announcements: docs.filter(function(ann) { 
      return ['queued', 'visible'].indexOf(ann.status) > -1; }),
      host: req.protocol + '://' + req.host, // for socket connection
      page: "admin",
      title: title});
  });
}

app.get('/admin', auth, function(req, res) {
  keen.addEvent("render_page", {"page": "/admin"})

  // first, if we have a toggle, do that
  if (req.query.toggle) {
    keen.addEvent("toggle", req.query);
    console.log("Toggling element " + req.query.toggle + " to " + req.query.to);
    announcements_db.update({_id: mongo.ObjectID.createFromHexString(req.query.toggle)}, 
      {$set: {status: req.query.to, modified: Date.now()}}, 
      function(err, doc) {
        if (err) throw(err);
        io.sockets.emit('reload', req.query.toggle + " to " + req.query.to);
        render_admin(req, res);
      })
  } else {
    render_admin(req, res);
  }
  
});

app.get('/adminbtn', auth, function(req, res) {
  // use params to decide what to do, then always redirect back to /admin
  if (req.query.from.match("unverified|queued|visible|archived") && 
      req.query.to.match("queued|visible|archived|deleted")) {
    keen.addEvent("admin_button", req.query)
    console.log("Moving all " + req.query.from + " announcements to " + req.query.to);
    // "deleted" isn't actually deleted, we just don't allow you to move anything from it
    announcements_db.update({status: req.query.from},
      {$set: {status: req.query.to, modified: Date.now()}},
      {multi: true},
      function(er, ct) {
        if (er) throw(er);
        console.log(ct + " announcements moved");
        io.sockets.emit('reload', req.query.from + " to " + req.query.to);
        res.redirect("/admin");
      }
    );
  } else {
    console.warning("Unexpected query ignored: " + req.query)
  }
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

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
