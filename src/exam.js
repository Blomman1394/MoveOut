"use strict";

const express = require('express');
const mysql = require("promise-mysql");
const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: 3306,   
    multipleStatements: true
};

const bcrypt = require('bcrypt');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const app = express();
const pool = require('../db/db.js');
const path = require('path');
const fs = require('fs');
let db;

// Middleware to parse the request body (form data)
app.use(express.urlencoded({ extended: true }));

// Establish a MySQL connection
(async function() {
    try {
        db = await mysql.createConnection(config);
        console.log("Connected to the database");

        // Handle exit to close the connection
        process.on("exit", () => {
            db.end();
        });
    } catch (err) {
        console.error("Database connection failed:", err);
    }
})();

// Function to call the addCustomer procedure
async function addCustomer(email, password) {

    if (!email) {
        throw new Error('Email cannot be null or empty.');
    }
    if (!password) {
        throw new Error('Password cannot be null or empty.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        let sql ='CALL addCustomer(?, ?, ?);';
        let res;
        res  = await db.query(sql, [email, hashedPassword, verificationToken]);
        return verificationToken;

    } catch (error) {
        // Log the error for debugging purposes
        console.error('Error adding customer:', error);
        throw new Error('Failed to add customer.');  // Throw a new error for clarity
    }
}

async function emailExists(email) {
    const query = 'CALL emailExists(?)';  // Calling the stored procedure
    const [rows] = await db.query(query, [email]);  // Assuming db.query returns an array of rows

    // Assuming your stored procedure returns the count as a single row with a property named 'count'
    if (rows.length > 0) {
        return rows[0].count;  // Return the count from the first row
    }

    return 0; // Return 0 if no rows were returned (in case of an error)
}



async function sendVerificationEmail(email, verificationToken) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'alexander.cabholding@gmail.com',
            pass: 'afqy ycti ksbi qffb'
        }
    });

    const mailOptions = {
        from: 'alexander.cabholding@gmail.com',
        to: email,
        subject: 'Email Verification',
        text: `Please verify your email by clicking on the following link: 
               http://localhost:1337/validate?token=${verificationToken}`
    };

    await transporter.sendMail(mailOptions);
}

async function verifyToken(token) {
    const query = 'CALL verifyEmail(?)'; 
    const result = await db.query(query, [token]); // Do not destructure to avoid iterable error

    console.log('Database query result:', result); // Log the full result to see the actual structure

    // Check if result contains affectedRows (assuming update query)
    if (result && result.affectedRows > 0) {
        return true; // Email has been verified
    }
    
    return false; // No matching token found or update failed
}

async function addLabel(customerId, labelName, background, icons) {
    let connection;

    try {
        // Get a connection from the pool
        connection = await new Promise((resolve, reject) => {
            pool.getConnection((err, conn) => {
                if (err) return reject(err);
                resolve(conn);
            });
        });

        // Begin a transaction
        await new Promise((resolve, reject) => {
            connection.beginTransaction((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Insert the new label into the labels table
        const result = await new Promise((resolve, reject) => {
            connection.query(
                'INSERT INTO labels (customer_id, label_name, background, icons) VALUES (?, ?, ?, ?)',
                [customerId, labelName, background, JSON.stringify(icons)], // Store icons as a JSON string
                (error, results) => {
                    if (error) return reject(error);
                    resolve(results); // Only return the results here
                }
            );
        });

        // Commit the transaction
        await new Promise((resolve, reject) => {
            connection.commit((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Return the ID of the newly inserted label
        return result.insertId; // This should now work as expected
    } catch (error) {
        console.error('Error adding label:', error);
        if (connection) {
            // Rollback the transaction if there was an error
            await new Promise((resolve) => {
                connection.rollback(() => {
                    connection.release();
                    resolve();
                });
            });
        }
        throw error; // Re-throw the error to handle it in the calling function
    } finally {
        // Ensure the connection is released only if it's still valid
        if (connection) {
            connection.release();
        }
    }
}

async function getLabelDetails(labelId) {
    let connection; // Declare connection here

    try {
        // Get a connection from the pool
        connection = await new Promise((resolve, reject) => {
            pool.getConnection((err, conn) => {
                if (err) return reject(err);
                resolve(conn);
            });
        });

        // Query to get the label details
        const labelDetails = await new Promise((resolve, reject) => {
            connection.query(
                'SELECT * FROM labels WHERE id = ?',
                [labelId],
                (error, results) => {
                    if (error) return reject(error);
                    resolve(results); // Return the results
                }
            );
        });

        return labelDetails[0]; // Assuming you're interested in the first result
    } catch (error) {
        console.error('Error fetching label details:', error);
        throw error; // Re-throw to handle it in the calling function
    } finally {
        if (connection) {
            connection.release(); // Release the connection
        }
    }
}
async function getCustomerLabels(userId) {
    return await db.query('SELECT * FROM labels WHERE customer_id = ?', [userId]);
}
async function getCustomer(userId) {
    return await db.query('SELECT email FROM customer WHERE id = ?', [userId]);
}
async function getAllEmails() {
    const query = 'SELECT email FROM customer'; // SQL query to get all emails
    const rows = await db.query(query); // Get the result from the query

    console.log('Database Query Result:', rows); // Log the entire result for debugging

    // Ensure rows is an array
    if (!Array.isArray(rows)) {
        throw new Error('Expected an array of rows from the database query');
    }

    // Extract email addresses from RowDataPacket objects
    return rows.map(row => row.email); // Return an array of email addresses
}
async function getAllCustomers() {
    const query = 'CALL getAllCustomers()'; // Assuming you have a stored procedure to get all customers
    const [rows] = await db.query(query); // Assuming db.query returns an array of rows
    return rows; // Return all customers
}

// Function to get all labels
async function getAllLabels() {
    const query = 'CALL getAllLabels()'; // Assuming you have a stored procedure to get all labels
    const [rows] = await db.query(query); // Assuming db.query returns an array of rows
    return rows; // Return all labels
}

// Function to delete a customer by ID
async function deleteCustomer(customerId) {
    const query = 'CALL deleteCustomer(?)'; // Assuming you have a stored procedure to delete a customer
    await db.query( query, [customerId]); // No need to return anything, just execute the query
}

// Function to delete a label by ID
async function deleteLabel(labelId) {
    const query = 'CALL deleteLabel(?)'; // Assuming you have a stored procedure to delete a label
    await db.query(query, [labelId]); // No need to return anything, just execute the query
}

// Function to update a customer
async function updateCustomer(customerId, updatedData) {
    const { email,  verified, is_admin } = updatedData;
    console.log(customerId,email,verified,is_admin);
    const query = 'CALL updateCustomer(?, ?, ?, ?)'; // Assuming you have a stored procedure to update a customer
    await db.query(query, [customerId, email, verified, is_admin]); // No need to return anything, just execute the query
}


async function sendMarketingEmail(email, verificationToken) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'alexander.cabholding@gmail.com',
            pass: 'afqy ycti ksbi qffb'
        }
    });

    const mailOptions = {
        from: 'alexander.cabholding@gmail.com',
        to: email,
        subject: 'Email Verification',
        text: `Hi dear Customer, if you appriciate my application please dont be afraid to send me a swish as appriciation.
        My number is 0725-89 34 56 or this qr-code: `,

    };

    await transporter.sendMail(mailOptions);
}

async function sendUpdatedEmail(email, newEmail, verificationToken) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'alexander.cabholding@gmail.com',
            pass: 'afqy ycti ksbi qffb'
        }
    });

    const mailOptions = {
        from: 'alexander.cabholding@gmail.com',
        to: email,
        subject: 'Email Verification',
        text: `Hi dear Customer, your new email is: ${newEmail}. We hope you are satisfied with our product.`,
    };

    await transporter.sendMail(mailOptions);
}

module.exports={
    verifyToken : verifyToken,
    sendVerificationEmail : sendVerificationEmail,
    addCustomer : addCustomer,
    emailExists : emailExists,
    addLabel: addLabel, 
    getLabelDetails: getLabelDetails,
    getCustomerLabels: getCustomerLabels,
    getAllCustomers: getAllCustomers,
    getAllLabels: getAllLabels,
    deleteCustomer: deleteCustomer,
    deleteLabel: deleteLabel,
    updateCustomer: updateCustomer,
    getCustomer: getCustomer,
    sendMarketingEmail: sendMarketingEmail,
    getAllEmails: getAllEmails,
    sendUpdatedEmail: sendUpdatedEmail
}
