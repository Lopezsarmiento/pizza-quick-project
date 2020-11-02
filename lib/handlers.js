/*
* Request handlers
*/
'use strict';

// Dependencies
// modules
const tokenRoutes = require('./routes/tokenRoutes');
const userRoutes = require('./routes/userRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
// global vars
const availMethods = ['POST', 'GET', 'PUT', 'DELETE'];
// handlers definition
const handlers = {};

// handlers
handlers.ping = (data, callback) => {
  callback(200, {ping: "pong"});
};

// handlers.users manages
// User registration - POST
// User info - GET
// User edition - PUT
// User deletion - DELETE
handlers.users = (data, callback) => {
  if (availMethods.indexOf(data.method) > -1) {
    userRoutes[data.method.toLowerCase()](data, callback);
  } else {
    // http method not allowed
    callback(405);
  }
};

// handlers.tokens manages
// token creation/login - POST
// token info - GET
// token edition - PUT
// token deletion/logout - DELETE
handlers.tokens = (data, callback) => {
  if (availMethods.indexOf(data.method) > -1) {
    tokenRoutes[data.method.toLowerCase()](data, callback);
  } else {
    // http method not allowed
    callback(405);
  }
};

handlers.menu = (data, callback) => {
  if (data.method === 'GET') {
    menuRoutes[data.method.toLowerCase()](data, callback);
  } else {
    // http method not allowed
    callback(405);
  }
}

handlers.orders = (data, callback) => {
  if (data.method === 'POST') {
    orderRoutes[data.method.toLowerCase()](data, callback);
  } else {
    // http method not allowed
    callback(405);
  }
}

handlers.notFound = (data, callback) => {
  callback(404, { Message: 'handler not found'});
};

module.exports = handlers;