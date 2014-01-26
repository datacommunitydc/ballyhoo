// for now, use this to reset the MongoDB

var mongo = require('mongodb');

var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost/mydb';

var test_docs = [
	{
		image_url: "http://photos4.meetupstatic.com/photos/member/5/3/f/4/member_57681492.jpeg",
		username: "Harlan Harris",
		email: "harlan@harris.name",
		url: "http://sentrana.com",
		announcement: "Sentrana is hiring software engineers",
		status: "unvalidated",
		submitted: 1390696303,
		validation_key: "valkey1"
	},
	{
		image_url: "http://photos4.meetupstatic.com/photos/member/5/3/f/4/member_57681492.jpeg",
		username: "Harlan Harris",
		email: "harlan@harris.name",
		url: "http://sentrana.com",
		announcement: "Sentrana is hiring bunnies",
		status: "queued",
		submitted: 1390696304,
		validation_key: "valkey2"
	},
	{
		image_url: "http://photos4.meetupstatic.com/photos/member/5/3/f/4/member_57681492.jpeg",
		username: "Harlan Harris",
		email: "harlan@harris.name",
		url: "http://sentrana.com",
		announcement: "Sentrana is hiring monkeys",
		status: "queued",
		submitted: 1390696305,
		validation_key: "valkey3"
	}

];

mongo.Db.connect(mongoUri, function (err, db) {
	db.dropCollection('announcements', function(er,rs) {
		var collection = db.collection('announcements');
		collection.insert(test_docs, function(er,rs) {
	  		if(err) throw err;
	  		db.close();
	    });
	});
});

