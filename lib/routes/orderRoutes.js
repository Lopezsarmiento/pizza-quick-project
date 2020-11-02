'use strict';
// Dependencies
// modules
const _data = require('../data');
const helpers = require('../helpers');
const tokens = require('../routes/tokenRoutes');
// global vars

// container for order routes
const orders = {};

// Checks - post
// Required data: items
// Opt data: none
orders.post = (data, callback) => {
  // verify payload has been included
  if (!data.payload) {
    return callback(400, {Error: 'Missing required data(email, shopping cart).'});
  }
  // input validation
  const cart = (typeof data.payload.cart === "object" && data.payload.cart instanceof Array && data.payload.cart.length > 0) ? data.payload.cart : false;
  const email = (typeof(data.payload.email) === 'string' && data.payload.email.trim().length > 0) ? data.payload.email.trim() : false;

  // exit if missing inputs or invalid
  if (!cart) {
    return callback(400, {
      Error: "Shopping cart is empty.",
    });
  }

  // Get token form headers
  // authorization
  // Get token
  const token = (typeof data.headers.token === "string") ? data.headers.token : false;
  if (!token) {
    return callback(403, {Error: 'token missing'});
  }
  // Validate token
  tokens.verifyToken(token, email, (tokenIsValid) => {
    if (!tokenIsValid) {
      return callback(403, { Error: "token missing or invalid" });
    }

    // Auth successful then continue
    // user lookup by reading token
    _data.read("tokens", token, (err, tokenData) => {
      if (err || !tokenData) {
        return callback(403);
      }

      const userEmail = tokenData.email;
      // Get user data
      _data.read("users", userEmail, (err, userData) => {
        if (err || !userData) {
          return callback(403);
        }

        const userOrders = (typeof userData.orders === "object" && userData.orders instanceof Array) ? userData.orders : [];

        // Create id for order
        const orderId = helpers.createRandomString(20);

        // create order obj
        const orderObject = {
          orderId,
          email,
          date: helpers.setDate(),
          items: cart
        };

        ///
        //PAY ORDER IN THIS SECTION
        // CREATE PAYMENT SERVICE
        // CREATE EMAIL SERVICE
        ///

        // save order object
        _data.create("orders", orderId, orderObject, (err) => {
          if (err) {
            console.log('error creating order: ', err);
            return callback(500, { Error: "Could not create the new order" });
          }

          //add order id to users object
          userData.orders= userOrders;
          userData.orders.push(orderId);

          // Save new user data
          _data.update("users", userEmail, userData, (err) => {
            if (err) {
              return callback(500, {
                Error: "Could not update the user with the new check",
              });
            }
            // return data with new check
            callback(200, orderObject);
          });
        });
      });
    });
  });
};

// Export module
module.exports = orders;