/*
 * Server related file
 *
 */

// Dependencies
const http = require("http");
const https = require("https");
const fs = require("fs");
const { StringDecoder } = require("string_decoder");
const url = require("url");
const path = require('path');
// modules
const helpers = require('./helpers');
const config = require("./config");
const handlers = require("./handlers");


// instantiate server object
const server = {};

server.httpserver = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});


server.serverOptions = {
  key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "/../https/cert.pem")),
};

// instantiate https server
server.httpsserver = https.createServer(server.serverOptions, (req, res) => {
  server.unifiedServer(req, res);
});



server.unifiedServer = (req, res) => {
  // Get url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  // //Get query string
  const queryStringObject = url.parse(req.url, true).query;

  //Get http method
  const method = req.method;

  // Get headers
  const headers = req.headers;

  // Get the payload
  const decoder = new StringDecoder("utf-8");
  let buffer = "";
  req.on("data", (data) => {
    buffer += decoder.write(data);
  });

  req.on("end", () => {
    buffer += decoder.end();

    // choose handler this request should go to. if not found use not found handler.
    const chosenHandler = typeof(server.router[trimmedPath]) !== "undefined" ? server.router[trimmedPath] : handlers.notFound;
    // build data obj
    const data = {
      trimmedPath,
      method,
      queryStringObject,
      headers,
    };

    // sometimes there is no data in buffer
    if (buffer) {
      data.payload = helpers.parseJsonToObject(buffer);
    }
    // Route the request to the specific handler.
    chosenHandler(data, (statusCode, payload) => {
      statusCode = typeof statusCode === "number" ? statusCode : 200;
      payload = typeof payload === "object" ? payload : {};

      // convert payload to a str
      const payloadString = JSON.stringify(payload);

      // return response
      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadString);

      //log request path
      if (statusCode === 200) {
        console.log('\x1b[32m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
      } else {
        console.log('\x1b[31m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
      };
      
    });
  });
};

/* define router
* users would register through users.post
* users data can be edited using users.put
* users can be delete by calling users.delete
*
* users log in using tokens.post
* users log out using tokens.delete
* to update token use tokens.put
*/
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens
};

// Init script
server.init = () => {
  // Start servers
  server.httpserver.listen(config.httpPort, () => {
    console.log('\x1b[42m%s\x1b[0m', `http server listening on port: ${config.httpPort}.`);
  });
  
  server.httpsserver.listen(config.httpsPort, () => {
    console.log('\x1b[42m%s\x1b[0m', `https server listening on port: ${config.httpsPort}.`);
  });
}


// Export module
module.exports = server;
