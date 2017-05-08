'use strict';

const async = require('async');
const request = require('request');
const config = require('./config');
const episodePicker = require('./episodePicker');

exports.router = (req, res) => {
  switch (req.method) {
    case 'GET':
    handleGet(req, res);
    break;

    case 'POST':
    handlePost(req, res);
    break;
    
    default:
    res.status(500).send({
      error: '👎'
    });
  }
};

const handleGet = (req, res) => {
  const isSubscriptionMode = req.query['hub.mode'] === 'subscribe';
  const hasValidToken = req.query['hub.verify_token'] === config.verifyToken;

  if (isSubscriptionMode && hasValidToken) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).send({error: '🚫'});
  }
};

const handlePost = (req, res) => {
  const data = req.body;
  if (data.object === 'page') {
    data.entry.forEach((entry) => {
      const pageID = entry.id;
      const timeOfEvent = entry.time;

      entry.messaging.forEach((event) => {
        if (event.message) {
          receivedMessage(event);
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    res.sendStatus(200);
  }
};

function receivedMessage(event) {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const timeOfMessage = event.timestamp;
  const message = event.message;

  console.log(`Received message from ${senderID} at ${timeOfMessage}`);
  console.log(JSON.stringify(message));

  const messageId = message.mid;
  const messageText = message.text;
  const messageAttachments = message.attachments;

  if (messageText) sendTextMessage(senderID, messageText);
  else if (messageAttachments) sendTextMessage(senderID, messageAttachments);
}

function sendTextMessage(recipientId, messageText) {
  const episode = episodePicker();

  const message = {
    "attachment": {
          "type": "template",
          "payload": {
              "template_type": "list",
              "top_element_style": "large",
              "elements": [
                  {
                      "title": episode.title,
                      "image_url": episode.poster_url,
                      "subtitle": `Season ${episode.season}: Episode ${episode.number}`
                  },
                  {
                      "title": `${episode.time_of_day}\non a ${episode.weekday}`,
                      "subtitle": episode.description
                  }
              ],
               "buttons": [
                  {
                    "type": "web_url",
                    "url": `https://netflix.com/watch/${episode.netflix_id}`,
                    "title": "Watch on Netflix"
                  }
              ]
          }
      }
    };

  const messageData = {
    recipient: {
      id: recipientId
    },
    message: message
  };

 callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    method: 'POST',
    json: messageData,
    qs: {
      access_token: config.facebookToken
    }
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      const recipientId = body.recipient_id;
      const messageId = body.message_id;

      console.log(`Successfully sent message ${messageId} to recipient ${recipientId}`);
    }

    else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}