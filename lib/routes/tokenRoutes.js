'use strict';
// Dependencies
// modules
const _data = require('../data');
const helpers = require('../helpers');
// global vars
const tokensDir = 'tokens';
const usersDir = 'users';

// container for token routes
const tokens = {};

// post
// Required data: email, password
// opt data: none
tokens.post = (data, callback) => {
  // verify payload has been included
  if (!data.payload) {
    return callback(400, {Error: 'Missing required data(email, password).'});
  }

  // validate req fields
  const email = (typeof(data.payload.email) === 'string' && data.payload.email.trim().length > 0) ? data.payload.email.trim() : false;
  const password = (typeof data.payload.password === "string" && data.payload.password.trim().length > 5) ? data.payload.password.trim() : false;

  if (!email || !password) {
    return callback(400, { Error: "Missing required fields" });
  }

  // Lookup for user matching criteria
  _data.read(usersDir, email, (err, userData) => {
    if (err) {
      return callback(400, { Error: "Could not find the specified user" });
    }

    // Hash password
    const hashedPassword = helpers.hash(password);
    if (!hashedPassword) {
      return callback(500, { Error: "Could not hash password" });
    }

    // chech for password matching
    if (hashedPassword !== userData.hashedPassword) {
      return callback(400, {
        Error: "Password does not match stored password",
      });
    }

    // Create token with random name and expiration 1 hour in the future.
    const tokenId = helpers.createRandomString(20);
    const expires = Date.now() * 1000 * 60 * 60;
    const tokenobj = {
      email,
      id: tokenId,
      expires,
    };

    // Store token
    _data.create(tokensDir, tokenId, tokenobj, (err) => {
      if (err) {
        return callback(500, { Error: "Could not save new token" });
      }
      // return token
      callback(200, tokenobj);
    });
  });
};

// get
// Req data: tokenId
// Opt data: none
tokens.get = (data, callback) => {
  // validate tokenId
  const tokenId = (typeof data.queryStringObject.tokenId === "string" && data.queryStringObject.tokenId.trim().length === 20 ) ? data.queryStringObject.tokenId.trim() : false;

  if (!tokenId) {
    return callback(400, {
      Error: "Missing required field or field is invalid",
    });
  }

  _data.read(tokensDir, tokenId, (err, data) => {
    if (!err && data) {
      callback(200, data);
    } else {
      callback(404, { Message: "TokenId not found" });
    }
  });
};

// put
// Required data: id, extend
// Opt data: none
tokens.put = (data, callback) => {
  // verify payload has been included
  if (!data.payload) {
    return callback(400, {Error: 'Missing required data(id, extend).'});
  }

  const id = (typeof data.payload.id === "string" && data.payload.id.trim().length === 20) ? data.payload.id.trim() : false;
  const extend = (typeof data.payload.extend === "boolean" && data.payload.extend) ? data.payload.extend : false;

  if (id && extend) {
    // look up for token data
    _data.read(tokensDir, id, (err, tokenData) => {
      if (id && tokenData) {
        // check for token expiration
        if (tokenData.expires < Date.now()) {
          callback(400, {
            Error: "Token has already expired, and cannot be extended",
          });
        }

        // update token expiration
        tokenData.expires = Date.now() + 1000 * 60 * 60;

        // store tokenData
        _data.update(tokensDir, id, tokenData, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not update token expiration date" });
          }
        });
      } else {
        callback(400, { Error: "Specified token does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields or invalid" });
  }
};

// delete
tokens.delete = (data, callback) => {
  // validate phone number
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (!id) {
    return callback(400, { Error: "Missing required field" });
  }

  _data.read(tokensDir, id, (err, data) => {
    if (!err && data) {
      _data.delete(tokensDir, id, (err) => {
        console.log("error in delete", err);
        if (!err) {
          return callback(200, { Message: "token deleted successfully" });
        } else {
          return callback(500, {
            Error: "Could not delete the specified token",
          });
        }
      });
    } else {
      return callback(400, { Error: "Could not find the specified token" });
    }
  });
};

tokens.verifyToken = (id, email, callback) => {
  // lookup for token
  _data.read(tokensDir, id, (err, tokenData) => {
    if (err) {
      return callback(false);
    }
    // check token belongs to the user and it is not expired
    if (tokenData.email !== email || tokenData.expires < Date.now()) {
      return callback(false);
    }
    return callback(true);
  });
};

// export module
module.exports = tokens;
