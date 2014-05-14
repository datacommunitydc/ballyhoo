// web.js
var express = require("express");
var http = require('http');
var path = require('path');

var logfmt = require("logfmt");

var mongo = require('mongodb');

var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost/mydb';

var meetupName = process.env.MEETUP_NAME || "Meetup";
var appName = "Ballyhoo" + (meetupName != "" ? (": " + meetupName) : "");

// to send email, including validation email, this must be a Postmark Sender Signature
var adminEmail = process.env.ADMIN_EMAIL || "harlan@datacommunitydc.org";

var postmarkKey = process.env.POSTMARK_API_KEY || "";
var postmark = require("postmark")(postmarkKey);

var app = express();
var flash = require('connect-flash');

var util = require('util');

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

var admin_pw = process.env.ADMIN_PW || "";
var auth = express.basicAuth('admin', admin_pw);

var server = http.createServer(app);
var io = require('socket.io').listen(server);
io.set('log level', 2);

var announcements_db; // for scoping?

app.get('/', function(req, res) {
  announcements_db.find({status: 'visible'},
                        {sort: [['modified', -1]]}).toArray(function(err, docs) {
    res.render('index', { announcements: docs,
      messages: req.flash('info'), 
      warnings: req.flash('info'),
      title: appName});
  });
  
});

app.get('/about', function(req, res) {
  res.render('about', {title: "About Ballyhoo"});
});

var validate_template = "Your Ballyhoo announcement needs to be validated. Once it is\
validated, a %s organizer can make it visible during the event. This is what it'll look like:\n\
\n\
[Your Photo Here]\n\
%s\n\
%s\n\
%s\n\
\n\
If that looks fine, click here:\n\
\n\
%s\n\
\n\
If it's bad, ignore this message.\n\
\n\
Thank you!\n\
\n\
Ballyhoo\n\
";

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
  var end_message_re = /.*Member since/;
  var url_re = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
  var userurl_re = new RegExp("http://www.meetup.com/[^/]+/members/\\d+", "i");
  var photo_re = new RegExp("http://photo[^.]*.meetupstatic.com/photos/member/[^.]+.jpeg", "i");
  var image_url;
  if (req.body.HtmlBody.match(/noPhoto/)) {
    image_url = "/yellout.png";
  } else {
    image_url = req.body.HtmlBody.match(photo_re)[0].replace("thumb_", "member_");
  }
  if (subj_match) {

    // extract any URL from before the end of the message; or "" if none provided
    var url_match = req.body.TextBody.match(end_message_re)[0].match(url_re);
    var url_str = url_match ? url_match[0] : "";

    var annc = {
      username: subj_match[1],
      announcement: subj_match[2],
      url: url_str,
      email: req.body.ReplyTo,
      userurl: req.body.TextBody.match(userurl_re)[0],
      image_url: image_url,
      status: "unverified"
    };
    // write to the db
    announcements_db.insert(annc, function(er,rs) {
        if(er) throw er;

        // send notification email to user
        postmark.send({
          "From": adminEmail,
          "To": req.body.ReplyTo,
          "Subject": "Verify your Ballyhoo announcement: " + subj_match[2],
          "TextBody": util.format(validate_template, meetupName, 
            subj_match[1], subj_match[2], url_str,
            req.protocol + '://' + req.host + "/validate?id=" + rs[0]._id
            )
          }, function(error, success) {
            if(error) {
                console.error("Unable to send validate message: " + error.message);
                return;
            }
            console.log("Sent validate message.");
        })
    });
    console.log("Inserted announcement from ", annc.username);
  } else {
    // forward
    postmark.send({
        "From": req.body.From, 
        "To": adminEmail, 
        "Subject": req.body.Subject, 
        "TextBody": req.body.TextBody
      }, function(error, success) {
          if(error) {
              console.error("Unable to send via postmark: " + error.message);
              return;
          }
          console.log("Received email, but doesn't seem to be an announcement: ", req.body.Subject);
      });
  };
  
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

app.get('/admin', auth, function(req, res) {
  // first, if we have a toggle, do that
  if (req.query.toggle) {
    console.log("Toggling element " + req.query.toggle + " to " + req.query.to);
    announcements_db.update({_id: mongo.ObjectID.createFromHexString(req.query.toggle)}, 
      {$set: {status: req.query.to, modified: Date.now()}}, 
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
