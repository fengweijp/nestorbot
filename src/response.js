var __slice = [].slice;
var Promise = require('promise');
var URLSafeBase64 = require('urlsafe-base64');

var RichResponse = function RichResponse() {
  var opts = arguments[0] || {};

  this.fallback = opts.fallback;
  this.color = opts.color || "good";
  this.pretext = opts.pretext;
  this.author_name = opts.author_name;
  this.author_link = opts.author_link;
  this.author_icon = opts.author_icon;
  this.title = opts.title;
  this.title_link = opts.title_link;
  this.text = opts.text;
  this.fields = opts.fields || [];
  this.image_url = opts.image_url;
  this.thumb_url = opts.thumb_url;
};

// Public: Responses are sent to matching listeners. Messages know about the
// content and user that made the original message, and how to reply back to
// them.
//
// robot   - A Robot instance.
// message - A Message instance.
// match   - A Match object from the successful Regex match.
var Response = function Response(robot, message, match) {
  this.robot = robot;
  this.message = message;
  this.match = match;
};

// Public: Posts a message back to the chat source
//
// strings - One or more strings to be posted. The order of these strings
//           should be kept intact.
//
// Returns boolean flag denoting whether the call was successfully
Response.prototype.send = function(payload, callback) {
  return this.__send(payload, false, callback);
};

// Public: Posts a message mentioning the current user.
//
// strings - One or more strings to be posted. The order of these strings
//           should be kept intact.
//
// Returns boolean flag denoting whether the call was successfully
Response.prototype.reply = function(payload, callback) {
  return this.__send(payload, true, callback);
};

// Public: Tell the message to stop dispatching to listeners
//
// Returns nothing.
Response.prototype.finish = function() {
  return this.message.finish();
};

Response.prototype.__send = function(payload, reply, callback) {
  var textPayloads = [];
  var richPayloads = [];

  if(payload instanceof Array) {
    for(var i in payload) {
      var p = payload[i];
      if (p.constructor == String) {
        textPayloads.push(p);
      } else if (p.constructor == RichResponse) {
        richPayloads.push(p);
      }
    }
  } else if (payload.constructor == String) {
    textPayloads.push(payload);
  } else if (payload.constructor == RichResponse) {
    richPayloads.push(payload);
  }

  var _this = this;
  // If robot is in debugMode, then don't actually send response back
  // just buffer them and Nestor will deal with it
  if(this.robot.debugMode) {
    _this.robot.toSend = _this.robot.toSend.concat({strings: textPayloads, reply: reply });
    if(callback !== undefined) { callback(); }
    return Promise.resolve();
  }

  var authToken = process.env.__NESTOR_AUTH_TOKEN;
  var host = process.env.__NESTOR_API_HOST;
  if (host == null) {
    host = "https://v2.asknestor.me";
  }
  var url = host + "/teams/" + this.robot.teamId + "/messages";

  if(this.message.user == null || this.message.room == null || (textPayloads.length == 0 && richPayloads.length == 0)) {
    if(callback !== undefined) { callback(); }
    return Promise.resolve();
  }

  var params =  {
    message: {
      user_uid: this.message.user.id,
      channel_uid: this.message.room,
      reply: reply
    }
  };

  if(textPayloads.length > 0) {
    params.message.text = JSON.stringify(textPayloads);
  }

  if(richPayloads.length > 0) {
    params.message.rich = JSON.stringify(richPayloads);
  }

  return new Promise(function(fulfill, reject) {
    _this.robot.http(url).
      header('Authorization', authToken).
      header('Content-Type', 'application/json').
      post(JSON.stringify(params))(function(err, resp, body) {
        if(callback !== undefined) { callback(); }
        if (err) { reject(err); } else { fulfill(resp); }
    });
  });
}

module.exports = {
  Response: Response,
  RichResponse: RichResponse
};
