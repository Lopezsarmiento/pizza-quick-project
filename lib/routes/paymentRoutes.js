"use strict";
const { userInfo } = require("os");
const { callbackify } = require("util");
// Dependencies
// modules
const _data = require("../data");
const helpers = require("../helpers");
const tokens = require("../routes/tokenRoutes");
// global vars

// container for order routes
const payments = {};

// Pay - POST
// Required data: orderid, payment Option
// Optional data: none
payments.post = (data, callback) => {
  // verify payload has been included
  if (!data.payload) {
    return callback(400, {
      Error: "Missing required data(orderId, payment option).",
    });
  }

  // input validation
  // validate id number
  const orderId =
    typeof data.payload.id === "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;

  const paymentOption =
    typeof data.payload.paymentOption === "string" &&
    data.payload.paymentOption.trim().length > 0
      ? data.payload.paymentOption.trim()
      : false;

  // exit if missing inputs or invalid
  if (!orderId) {
    return callback(400, { Error: "Missing or invalid order id" });
  }

  if (!paymentOption) {
    return callback(400, { Error: "Missing or invalid payment option" });
  }

  // Order lookup
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

      // send to payment
      const amount = helpers.calculateTotal(orderInfo);
      helpers.makePayment(amount, (err, payInfo) => {
        if (err) {
          return callback(err);
        }
        // update order status
        orderInfo.paymentCompleted = true;
        // Add payment transaction info to orderInfo
        orderInfo.paymentInfo = payInfo;

        _data.update("orders", orderId, orderInfo, (err) => {
          if (err) {
            return callback(500, { Error: "Error updating order." });
          }

          // send email to client
          console.log("mail sent to client");
          console.log("odrder info: ", orderInfo);
          // Send e-mail with a receipt
          let toEmail = userInfo.email;
          let toName = userInfo.email;
          let subject = "Your Pizza Receipt";
          let message = "Thank you for buying";

          // helpers.mailgunSendEmail(toEmail, toName, subject, message, (err) => {
          //   if (!err) {
          //     callback(200);
          //   } else {
          //     callback(500, { Error: "Unable to send receipt via e-mail" });
          //   }
          // });
          // return to client
          callback(200, orderInfo);
        });
      });
    });
  });
};

// Export module
module.exports = payments;
