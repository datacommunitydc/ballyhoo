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

* TODO
* Heroku
* Mongo
* Set up and validate a Postmark account through Heroku. You'll need an email address whose forwarding you can control. 
* Create and validate new Meetup user called Ballyhoo, whose email address is the one whose forwarding you control. One the user is configured, change the forwarding to point to the *@inbound.postmarkapp.com  address that Postmark provides.
* Have Postmark deliver messages sent to Ballyhoo to go to your app, `appname.herokuapp.com/email` or whatever. 
* If you're debugging that connection, [ngrok](http://ngrok.com) is a handy way to forward the webhook
from Postmark to a local (firewalled or localhost) instance of Ballyhoo.

To contribute to Ballyhoo, please submit pull requests or issues via [our Github repository](https://github.com/datacommunitydc/ballyhoo/).

Technology
==========

Ballyhood is written in Node.js/Javascript. Useful packages include:

* TODO (list useful packages here)
