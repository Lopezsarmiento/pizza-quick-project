"use strict";
// Dependencies
// modules
const _data = require("../data");
const helpers = require("../helpers");
const tokens = require("../routes/tokenRoutes");
// global vars

// container for order routes
const orders = {};

// Order - post
// Required data: items
// Opt data: none
orders.post = (data, callback) => {
  // verify payload has been included
  if (!data.payload) {
    return callback(400, {
      Error: "Missing required data(email, shopping cart).",
    });
  }
  // input validation
  const cart =
    typeof data.payload.cart === "object" &&
    data.payload.cart instanceof Array &&
    data.payload.cart.length > 0
      ? data.payload.cart
      : false;

  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0
      ? data.payload.email.trim()
      : false;

  // exit if missing inputs or invalid
  if (!cart) {
    return callback(400, {
      Error: "Shopping cart is empty.",
    });
  }

  // Get token form headers
  // authorization
  // Get token
  const token =
    typeof data.headers.token === "string" ? data.headers.token : false;
  if (!token) {
    return callback(403, { Error: "token missing" });
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

        const userOrders =
          typeof userData.orders === "object" &&
          userData.orders instanceof Array
            ? userData.orders
            : [];

        // Create id for order
        const orderId = helpers.createRandomString(20);

        // create order obj
        const orderObject = {
          orderId,
          email,
          date: helpers.setDate(),
          items: cart,
          paymentCompleted: false,
        };

        ///
        //PAY ORDER IN THIS SECTION
        // CREATE PAYMENT SERVICE
        // CREATE EMAIL SERVICE
        ///

        // save order object
        _data.create("orders", orderId, orderObject, (err) => {
          if (err) {
            console.log("error creating order: ", err);
            return callback(500, { Error: "Could not create the new order" });
          }

          //add order id to users object
          userData.orders = userOrders;
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

// Order - GET
// Required - OrderId
// Opt data: none
orders.get = (data, callback) => {
  // validate id number
  const orderId =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (!orderId) {
    return callback(400, { Error: "Missing required field" });
  }

  // Orders lookup
  _data.read("orders", orderId, (err, orderInfo) => {
    if (err || !orderInfo) {
      return callback(404, { Error: "Order not found." });
    }

    // authorization
    // Get token
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;
    if (!token) {
      return callback(403, { Error: "token missing" });
    }

    // verify token is valid
    tokens.verifyToken(token, orderInfo.email, (tokenIsValid) => {
      if (!tokenIsValid) {
        return callback(403, { Error: "token missing or invalid" });
      }

      callback(200, orderInfo);
    });
  });
};

// Orders - PUT
// Required data: orderId
// Optional data: cart
orders.put = (data, callback) => {
  // verify payload has been included
  if (!data.payload) {
    return callback(400, {
      Error: "Missing required data(email, shopping cart).",
    });
  }
  // input validation
  // validate id number
  const orderId =
    typeof data.payload.id === "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;
  const cart =
    typeof data.payload.cart === "object" &&
    data.payload.cart instanceof Array &&
    data.payload.cart.length > 0
      ? data.payload.cart
      : false;

  // exit if missing inputs or invalid
  if (!orderId) {
    return callback(400, { Error: "Missing or invalid order id" });
  }

  if (!cart) {
    return callback(400, { Error: "Shopping cart is empty." });
  }

  // read order
  _data.read("orders", orderId, (err, orderInfo) => {
    if (err || !orderInfo) {
      return callback(404, { Error: "Order not found." });
    }

    // authorization
    // Get token
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;
    if (!token) {
      return callback(403, { Error: "token missing" });
    }

    // verify token is valid
    tokens.verifyToken(token, orderInfo.email, (tokenIsValid) => {
      if (!tokenIsValid) {
        return callback(403, { Error: "token missing or invalid" });
      }

      // update order data (cart)
      if (cart) {
        orderInfo.items = cart;
        orderInfo.lastUpdated = helpers.setDate();
      }

      // save updates
      _data.update("orders", orderId, orderInfo, (err) => {
        if (err) {
          return callback(500, { Error: "Error updating order." });
        }
        callback(200, orderInfo);
      });
    });
  });
};

// Orders - DELETE
// Required data: orderId
// Opt data: none
orders.delete = (data, callback) => {
  // validate required data
  const orderId =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (!orderId) {
    return callback(400, { Error: "Missing required field" });
  }

  // order lookup
  _data.read("orders", orderId, (err, orderInfo) => {
    if (err || !orderInfo) {
      return callback(404, { Error: "Order not found." });
    }

    if (orderInfo.paymentCompleted) {
      return callback(403, { Message: "Paid orders cannot be deleted." });
    }

    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;
    if (!token) {
      return callback(400, { Error: "Missing or invalid token." });
    }

    tokens.verifyToken(token, orderInfo.email, (tokenIsValid) => {
      if (!tokenIsValid) {
        return callback(403, { Error: "Token missing or invalid." });
      }

      // delete order if applicable
      _data.delete("orders", orderId, (err) => {
        if (err) {
          return callback(500, { Error: "Could not delete order." });
        }

        // lookup user and delete order
        _data.read("users", orderInfo.email, (err, userInfo) => {
          if (err || !userInfo) {
            return callback(500, { Error: "Could not find user." });
          }

          // Get user orders
          const userOrders =
            typeof userInfo.orders === "object" &&
            userInfo.orders instanceof Array
              ? userInfo.orders
              : [];

          // Get order position
          const orderPosition = userOrders.indexOf(orderId);
          if (orderPosition <= -1) {
            return callback(500, {
              Error: "Could not find the order in the users object.",
            });
          }

          // Remove order from array
          userOrders.splice(orderPosition, 1);

          // Save new userOrders
          _data.update("users", userInfo.email, userInfo, (err) => {
            if (err) {
              return callback(500, { Error: "Error updating order data." });
            }
            callback(200, userInfo);
          });
        });
      });
    });
  });
};

// Export module
module.exports = orders;
