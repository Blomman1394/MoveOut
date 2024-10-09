/**
 * A sample Express server with static resources.
 */
"use strict";

const port = 3306;
const path = require("path");
const express = require("express");
const mysql = require('mysql');
const app = express();
const db = require('./db/db');
const routeshop = require("./route/exam.js");
const middleware = require("./middleware/index.js");
const session = require('express-session');


// Set the view engine and views directory
app.set("view engine", "ejs");
app.set('views', './views');

// Middleware to log incoming requests
app.use(middleware.logIncomingToConsole);
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static('uploads'));
// Session middleware should come before routes
app.use(session({
    secret: 'Oswald', // Change this to a strong secret
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, 
        secure: false, // Set to true if using HTTPS
    }
}));

// Log session initialization
app.use((req, res, next) => {
    console.log('Session initialized:', req.session); // Check session initialization
    next();
});

// Body parser middleware for URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Static files middleware
app.use(express.static(path.join(__dirname, "public")));

// Route definitions should come after session middleware
app.use("/", routeshop);

// Start the server and log startup details
app.listen(port, logStartUpDetailsToConsole);

/**
 * Log app details to console when starting up.
 *
 * @return {void}
 */
function logStartUpDetailsToConsole() {
    let routes = [];

    // Find what routes are supported
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            // Routes registered directly on the app
            routes.push(middleware.route);
        } else if (middleware.name === "router") {
            // Routes added as router middleware
            middleware.handle.stack.forEach((handler) => {
                let route;
                route = handler.route;
                route && routes.push(route);
            });
        }
    });

    console.info(`Server is listening on port ${port}.`);
    console.info("Available routes are:");
    console.info(routes);
}
