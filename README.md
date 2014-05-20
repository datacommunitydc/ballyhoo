Ballyhoo
========

_Making Meetup Event Announcements Fast and Useful!_

    noun \ˈba-lē-ˌhü\

* a noisy attention-getting demonstration or talk
* flamboyant, exaggerated, or sensational promotion or publicity
* excited commotion


Does your Meetup event get bogged down by people announcing jobs, events, and other things? Do people announce amazing
opportunities, then disappear before actual connections are made? Then Ballyhoo is for you! Here's how it works:

1. Users create announcements _before_ the event, including their name, a URL, and a short text announcement. All that users need to do is send email via the Meetup.com website or mobile app to a custom Meetup user -- Ballyhoo.
2. During the event, as people make announcements aloud, an event organizer can promote queued announcements to make them visible. Visible announcements can be projected onto a big screen for users to see. Updates happen in real time!
4. Announcements have the name, URL, and text, plus a photo of the announcer. It's easy to follow up now!

Ballyhoo design and coding is led by Harlan Harris. 

Ballyhoo is Open Source Software, and is released under an MIT License (see LICENSE).

Each Meetup needs to separately configure and deploy their own instance of Ballyhoo. Here's what to do:

* Create an email forward under a domain you control (e.g., not gmail.com). For instance, forward `mymeetup-ballyhoo@mydomain.ninja` to your personal email address, temporarily. Create and validate a new Meetup user called Ballyhoo, whose email address is the one you just set up. Join that user to the Meetup you'd like to set up Ballyhoo on. (Note that currently each Meetup Ballyhoo user must be different -- in the future it'll be possible to use the same account to run Ballyhoo with multiple Meetup groups.) Once the Ballyhoo user is configured, uncheck all of the Email and Notifications checkboxes on the Meetup site. 
* Clone this repository. Create a new Heroku app. Add a new Heroku remote to your git repository. Push to Heroku. 
* Add a Sandbox instance of [MongoLab](https://addons.heroku.com/mongolab) to your Heroku app. The MONGOLAB_URI environment variable should be set for you.
* Add a minimal instance (10K messages) of [Postmark](https://addons.heroku.com/postmark) for your Heroku instance, so you can send and receive email. The POSTMARK_API_KEY, POSTMARK_SMTP_SERVER, and POSTMARK_INBOUND_ADDRESS variables should be set for you.
* Go to the Postmark admin screens from Heroku. Set the Inbound Hook to go to your app: `appname.herokuapp.com/email`. Create a Sender Signature with an appropriate email address, which might be the same as the Meetup user's email address. You'll need to validate that email address, and you may want to set up other authentication measures, as Postmark recommends.
* Back in the Heroku admin page, add additional [config/environment variables](https://devcenter.heroku.com/articles/config-vars). Set MEETUP_NAME to be the name of your Meetup group. Set ADMIN_EMAIL to be an address for mail sent to Ballyhoo that doesn't look like an announcement to be forwarded to -- likely your personal email address; it won't be visible to users. Optionally, set ADMIN_PW -- the password will be empty if not specified. 
* Only now, change the forwarding on your email address to point to the _bixhexstring@inbound.postmarkapp.com_ address that Postmark provides, aka POSTMARK_INBOUND_ADDRESS.
* That should be it! The admin login is `admin`, with the password you specified as an environment variable.

Developer Notes
===============
* If you're debugging the email connection, [ngrok](http://ngrok.com) is a handy way to forward the webhook
from Postmark to a local (firewalled or localhost) instance of Ballyhoo.
* If you're doing local development, the use of a .env file and `heroku config:push` may be helpful.
* `heroku logs --app herokuappname` can be useful to figure out problems.

To contribute to Ballyhoo, please submit pull requests or issues via [our Github repository](https://github.com/datacommunitydc/ballyhoo/). There's plenty of work to be done!

Technology
==========

Ballyhood is written in Node.js/Javascript. Useful packages include:

* express -- web services
* jade -- web page templating
* logfmt -- web server logging
* mongodb -- nosql database library
* connect-flash -- flash/warning messages to the user
* socket.io -- websockets library for triggered reloads
* postmark -- library to make sending email with Postmark easier
