/*
import { config } from '../config';
 * Helpers for various tasks
 *
 */

// Dependencies
const crypto = require("crypto");
const config = require("./config");
const menu = require("./menu");
const https = require("https");
const querystring = require("querystring");
// modules

// container
const helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
  if (typeof str !== "string" || str.length <= 0) {
    console.log(
      "pass is either not a string or length is less or equal than 0"
    );
    return false;
  }

  const hash = crypto
    .createHmac("sha256", config.hashingSecret)
    .update(str)
    .digest("hex");

  return hash;
};

// Parse a JSON obj in all cases without throwing
helpers.parseJsonToObject = (str) => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (error) {
    console.log("error while parsing buffer: ", error);
    return error;
  }
};

// Create a n alphanumeric random string
helpers.createRandomString = (strLength) => {
  // length validations
  strLength =
    typeof strLength === "number" && strLength > 0 ? strLength : false;

  if (!strLength) {
    return false;
  }

  // define possible chars
  const possibleChars = "abcdefghijklmnopqrstuvwxyz0123456789";

  let str = "";
  for (i = 1; i <= strLength; i++) {
    //Get random char from possibleChars
    const randomChar = possibleChars.charAt(
      Math.floor(Math.random() * possibleChars.length)
    );
    // Append char to str
    str += randomChar;
  }

  // Return final str
  return str;
};

// Send sms via twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
  // validate params
  phone =
    typeof phone === "string" && phone.trim().length === 10
      ? phone.trim()
      : false;
  msg =
    typeof msg === "string" && msg.trim().length > 0 && msg.trim().length < 1600
      ? msg.trim()
      : false;

  if (!phone || !msg) {
    return callback("Given params were missing or invalid.");
  }

  // Request payload
  const payload = {
    From: config.twilio.fromPhone,
    To: `+1${phone}`,
    Body: msg,
  };

  // stringify payload
  const stringPayload = querystring.stringify(payload);
  // configure request details
  const requestDetails = {
    protocol: "https:",
    hostname: "api.twilio.com",
    method: "POST",
    path: `/2010-04-01/Accounts${config.twilio.accountSid}/Messages.json`,
    auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(stringPayload),
    },
  };

  // instantiate request object
  const req = https.request(requestDetails, (res) => {
    // get status of sent req
    const status = res.statusCode;
    if (status === 200 || status === 201) {
      return callback(false);
    } else {
      callback(`Status code returned was ${status}`);
    }
  });

  // Bind to the error event so it does not get thrown
  req.on("error", (e) => {
    callback(e);
  });

  // Add payload to req
  req.write(stringPayload);
  //  End request
  req.end();
};

helpers.setDate = () => {
  const timeElapsed = Date.now();
  const today = new Date(timeElapsed);

  return today.toLocaleString();
};

helpers.makePayment = (amount, callback) => {
  // validate amount
  const payAmount = typeof amount === "number" && amount > 0 ? amount : false;

  if (!payAmount) {
    return callback("Parameters missing or invalid");
  }

  // build payload
  const payload = {
    amount: parseInt(payAmount.toFixed(2) * 100),
    currency: "usd",
    confirm: true,
    payment_method: "pm_card_visa",
  };

  // payload to string
  const stringpayload = querystring.stringify(payload);

  // build request options
  const requestOptions = {
    protocol: "https:",
    hostname: "api.stripe.com",
    method: "POST",
    path: "/v1/payment_intents",
    auth:
      "sk_test_51HjPCCIwA6VFOF0X2ad8slejnVwFLskBMPOaMvdVUzH22kMaYXOo07iI0pWVVcVvDmQLJoWGqO70EySqoFoI3nam00LUDh4FPW",
    headers: {
      "Content-type": "application/x-www-form-urlencoded",
      "Content-length": Buffer.byteLength(stringpayload),
    },
  };

  // build request
  const req = https.request(requestOptions, (res) => {
    const status = res.statusCode;
    res.setEncoding("utf8");
    res.on("data", (data) => {
      // Callback if payment successful
      if (status == 200 || status == 201) {
        callback(false, JSON.parse(data));
      } else {
        callback(status);
      }
    });
  });

  // Bind to the error event so it doesn't get thrown
  req.on("error", (e) => {
    callback(e);
  });

  // Add the payload
  req.write(stringpayload);

  // End the request
  req.end();
};

helpers.calculateTotal = (orderInfo) => {
  const items = orderInfo.items;
  let total = 0;
  items.forEach((item) => {
    menu.forEach((element) => {
      if (item.id === element.id) {
        total += element.price * item.quantity;
      }
    });
  });
  return total;
};
helpers.mailgunSendEmail = function (
  toEmail,
  toName,
  subject,
  message,
  callback
) {
  // validate parameters
  let emailRegex = /\S+@\S+\.\S+/;
  toEmail =
    typeof toEmail === "string" && emailRegex.test(toEmail)
      ? toEmail.trim()
      : false;
  toName =
    typeof toName === "string" && toName.trim().length > 2
      ? toName.trim()
      : false;
  subject =
    typeof subject === "string" && subject.trim().length > 2
      ? subject.trim()
      : false;
  message =
    typeof message === "string" && message.trim().length > 2
      ? message.trim()
      : false;

  if (toEmail && toName && message) {
    // Configure the request payload
    let payload = {
      from:
        "Pizza App <postmaster@sandboxa6baac78a4a64957987ab25d9b397b30.mailgun.org>",
      to: toEmail,
      subject: subject,
      text: message,
    };

    // Stringfy the payload
    let stringPayload = querystring.stringify(payload);

    // Configure the request details
    let requestDetails = {
      protocol: "https:",
      hostname: "api.mailgun.net",
      method: "POST",
      path: "/v3/sandboxa6baac78a4a64957987ab25d9b397b30.mailgun.org/messages",
      auth: config.mailgunCredential,
      headers: {
        "Content-type": "application/x-www-form-urlencoded",
        "Content-length": Buffer.byteLength(stringPayload),
      },
    };

    // Instantiate the request object
    let req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      let status = res.statusCode;

      // Callback successfuly if the request went through
      if (status == 200 || status == 201) {
        callback(false);
      } else {
        callback("Status code returned was " + status);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on("error", (e) => {
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();
  } else {
    callback("Given parameters are missing or invalid.");
  }
};

// Export module
module.exports = helpers;
