"use strict";

const path = require("path");
const express = require("express");
const session = require('express-session');
const middleware = require("../middleware/index.js");
const routeshop = require("../route/exam.js");

const app = express();

// Set the view engine and views directory
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));
// Middleware to log incoming requests
app.use(middleware.logIncomingToConsole);
app.use('../images', express.static(path.join(__dirname, 'images')));
app.use('../uploads', express.static('uploads'));

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

// Export the app as a module for Vercel to use
module.exports = app;