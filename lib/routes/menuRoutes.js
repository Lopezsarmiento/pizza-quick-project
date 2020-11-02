'use strict';
// Dependencies
// modules
const _data = require('../data');
const tokens = require('../routes/tokenRoutes');
// global vars
const menusDir = 'menus';

// container for token routes
const menu = {};

// menu - GET
// Require data: token
// optional data: none 
// Allow only authorized users to see menu data
menu.get = (data, callback) => {
  if (!data.queryStringObject) {
    return callback(400, {Error: 'Missing query string parameter.'});
  }
  console.log('query', data.queryStringObject.email);
  // validate required data
  const email = (typeof(data.queryStringObject.email) === 'string' && data.queryStringObject.email.trim().length > 0) ? data.queryStringObject.email.trim() : false;

  // validate email has been passed
  if (!email) {
    return callback(400, { Error: "Missing required field" });
  }
  // Auth
  // Get user token.
  const token = (typeof data.headers.token === "string") ? data.headers.token : false;
  if (!token) {
    return callback(403, {Error: 'token missing'});
  }
  // Validate token
  tokens.verifyToken(token, email, (tokenIsValid) => {
    if (!tokenIsValid) {
      return callback(403, {Error: 'token invalid'});
    }

    // if auth was successful continue.
    // user lookup
    _data.read(menusDir, 'menu', (err, data) => {
      if (!err && data) {
        callback(200, data);
      } else {
        callback(404, { Message: "menu not found" });
      }
    });
  });
};

// export module
module.exports = menu;