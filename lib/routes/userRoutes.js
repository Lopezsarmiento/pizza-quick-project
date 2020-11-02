'use strict';
// Dependencies
// modules
const _data = require('../data');
const helpers = require('../helpers');
const tokens = require('../routes/tokenRoutes');
// global vars
const usersDir = 'users';

// container for user routes
const users = {};

// Users - POST
// Require data: firstname, email, street address
// optional data: none 
users.post = (data, callback) => {
  // verify payload has been included
  if (!data.payload) {
    return callback(400, {Error: 'Missing required data(firstname, email, address).'});
  }
  // Required fields validations
  const name = (typeof(data.payload.firstname) === 'string' && data.payload.firstname.trim().length > 0) ? data.payload.firstname.trim() : false;
  const email = (typeof(data.payload.email) === 'string' && data.payload.email.trim().length > 0) ? data.payload.email.trim() : false;
  const password = (typeof data.payload.password === "string" && data.payload.password.trim().length > 5) ? data.payload.password.trim() : false;
  const address = (typeof(data.payload.address) === 'string' && data.payload.address.trim().length > 0) ? data.payload.address.trim() : false;
  // return if required data is missing
  if (!name || !email || !address || !password) {
    return callback(400, {Error: 'Missing required fields.'});
  }

  // verify if user already exist
  _data.read(usersDir, email, (err, data) => {
    if (!err && data) {
      return callback(400, {Error: "A user with that email already exists."});
    }

    // hash password
    const hashedPassword = helpers.hash(password);
    if (!hashedPassword) {
      return callback(500, {Error: "Could not hash password"});
    }

    // create user info obj
    const userinfo = {
      name,
      email,
      address,
      hashedPassword
    }
    // create user in file system
    _data.create(usersDir, email, userinfo, (err) => {
      if (err) {
        return callback(500, {Error: err});
      }

      callback(200, {Message: 'User created.'});
    });
  });
};

// Users - GET
// Require data: email
// optional data: none 
// Allow only authorized users to see own data
users.get = (data, callback) => {
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
    _data.read(usersDir, email, (err, data) => {
      if (!err && data) {
        const userInfo = {
          firstname: data.name,
          email: data.email,
          address: data.address
        };

        callback(200, userInfo);
      } else {
        callback(404, { Message: "User not found" });
      }
    });
  });
};

// Users - Put
// Required data: email
// Optional data: firstname, address (at least one must be passed)
// ONLY allow auth users to update data
users.put = (data, callback) => {
  // verify payload has been included
  if (!data.payload) {
    return callback(400, {Error: 'Missing required data(firstname, email, address).'});
  }
  // Required fields validations
  const name = (typeof(data.payload.firstname) === 'string' && data.payload.firstname.trim().length > 0) ? data.payload.firstname.trim() : false;
  const email = (typeof(data.payload.email) === 'string' && data.payload.email.trim().length > 0) ? data.payload.email.trim() : false;
  const address = (typeof(data.payload.address) === 'string' && data.payload.address.trim().length > 0) ? data.payload.address.trim() : false;

  if (!email) {
    return callback(400, {Error: 'Email is required.'});
  }
  // nothing to update
  if (!name && !address) {
    return callback(400, { Error: "Missing required fields for update" });
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
      return callback(403, {Error: 'token is invalid'});
    }

    // if auth was successful continue.
    // user lookup
    _data.read(usersDir, email, (err, userData) => {
      if (err) {
        return callback(400, { Error: "The specified user does not exist" });
      }

      // update necessary fields
      if (name) {
        userData.name = name;
      }

      if (address) {
        userData.address = address;
      }

      // stores updates
      _data.update(usersDir, email, userData, (err) => {
        if (err) {
          return callback(500, { Error: "Error updating the user info" });
        }
        callback(200, { message: "User info successfully updated" });
      });
    });
  });
};

// Users- delete
// Required field: email
// allow ONLY auth users
// @TODO delete any other files associated with  the user
users.delete = (data, callback) => {
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
      return callback(403, {Error: 'token is invalid'});
    }

    // if auth was successful continue.
    // user lookup
    _data.read(usersDir, email, (err, userData) => {
      if (!err && userData) {
        _data.delete(usersDir, email, (err) => {
          if (!err) {
            return callback(200, {
              Message: "User deleted successfully",
            });
          } else {
            return callback(500, {
              Error: "Could not delete the specified user",
            });
          }
        });
      } else {
        return callback(400, { Error: "Could not find the specified user" });
      }
    });
  });
};

// Export module
module.exports = users;