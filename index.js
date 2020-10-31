'use strict';
// Entry point for API.

// Dependencies
const server = require('./lib/server');
// app declaration
const app = {};
// app initialization
app.init = () => {
  //Start server
  server.init();
};
// Execute
app.init();

// Export module
module.exports = app;