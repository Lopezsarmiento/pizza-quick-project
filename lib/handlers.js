/*
* Request handlers
*/
'use strict';

// Dependencies
const userRoutes = require('./routes/userRoutes');
// global vars
const availMethods = ['POST', 'GET', 'PUT', 'DELETE'];
// handlers definition
const handlers = {};

// users
handlers._users = {};

// handlers
handlers.ping = (data, callback) => {
  callback(200, {ping: "pong"});
};

handlers.users = (data, callback) => {
  if (availMethods.indexOf(data.method) > -1) {
    userRoutes[data.method.toLowerCase()](data, callback);
  } else {
    // http method not allowed
    callback(405);
  }
}

handlers.notFound = (data, callback) => {
  callback(404);
};

module.exports = handlers;