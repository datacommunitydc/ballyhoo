Ballyhoo
========

_Making Meetup Event Announcements Fast and Useful!_

    noun \ˈba-lē-ˌhü\

* a noisy attention-getting demonstration or talk
* flamboyant, exaggerated, or sensational promotion or publicity
* excited commotion


Does your Meetup event get bogged down by people announcing jobs, events, and other things? Do people announce amazing
opportunities, then disappear before actual connections are made? Then Ballyhoo is for you! Here's how it works:

1. Attendees create announcements _before_ the event, including their name, a URL, and a short text announcement. All that attendees need to do is log in with their Meetup account and fill out a short form.
2. During the event, as people make announcements aloud, an event organizer can promote queued announcements to make them visible. Visible announcements can be projected onto a big screen for users to see. Updates happen in real time!
4. Announcements have the name, URL, and text, plus a photo of the announcer. It's easy to follow up now!

Ballyhoo design and coding is led by Harlan Harris, with contributions by Devin Castro, Mike Bullen,
and Dan Paz-Soldan. 

Ballyhoo is Open Source Software, and is released under an MIT License (see LICENSE). The Ballyhoo logo is from the public domain, via [openclipart](http://openclipart.org/detail/75487/yell-out-by-rgesthuizen).

Each Meetup needs to separately configure and deploy their own instance of Ballyhoo. Here's what to do:

* Clone this repository. Create a new Heroku app. Add a new Heroku remote to your git repository. Push to Heroku. 
* Enable websockets with `heroku labs:enable websockets --app herokuappname`
* Add a Sandbox instance of [MongoLab](https://addons.heroku.com/mongolab) to your Heroku app. The MONGOLAB_URI environment variable should be set for you.
* Create a [Meetup Consumer](https://secure.meetup.com/meetup_api/oauth_consumers/) for OAuth.
* Back in the Heroku admin page, add additional [config/environment variables](https://devcenter.heroku.com/articles/config-vars). Set MEETUP_NAME to be the name of your Meetup group. Optionally, set ADMIN_PW -- the password will be empty if not specified. Set MEETUP_KEY and MEETUP_SECRET from the OAuth page.
* Set up a [Keen.io](http://keen.io) account. Set the KEEN_PROJ_ID, KEEN_READ_KEY and KEEN_WRITE_KEY accordingly.
* That should be it! The admin login is `admin`, with the password you specified as an environment variable.

Developer Notes
===============
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
* keen.io -- server-side library for Keen.io
* passport and passport-meetup -- OAuth library
