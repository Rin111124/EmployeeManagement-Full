const express = require('express');
const registerExpressMiddleware = require('./loaders/express.loader');
const registerRoutes = require('./loaders/routes.loader');

const app = express();

registerExpressMiddleware(app);
registerRoutes(app);

module.exports = app;
