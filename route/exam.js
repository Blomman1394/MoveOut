"use strict";

const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const exam = require("../src/exam.js");
const connection = require('../db/db');
const bcryptjs = require('bcryptjs');
const sitename = "| Exam";
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up multer for handling file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads'); // Ensure this folder exists
    },
    filename: (req, file, cb) => {
        const userId = req.body.userId; // Get userId from form data
        const labelId = req.body.labelId; // Get labelId from form data
        const ext = path.extname(file.originalname);
        cb(null, `${userId}-${labelId}${ext}`); // Name format: userId-labelId.extension
    },
});

const upload = multer({ storage });

module.exports = router;

router.get("/", (req, res) => {
    const user = req.session.isLoggedIn ? {email: req.session.email, id: req.session.userId, is_admin: req.session.is_admin, is_admin: req.session.is_admin } : null; // Get user data from the session

    let data = {
        title: `Welcome ${sitename}`, // Your site name variable
        user // Include the user variable
    };

    res.render("index", data); // Render index with data
});




router.get("/register", (req, res) => {
    const user = req.session.isLoggedIn ? {email: req.session.email, id: req.session.userId, is_admin: req.session.is_admin } : null;
    let data = {
        title: `Welcome ${sitename}`, 
        user
    };

    res.render("register", data);
});

router.post('/register', async (req, res) => {
    console.log('Request Body:', req.body); // Log the request body
    const user = req.session.isLoggedIn ? {email: req.session.email, id: req.session.userId, is_admin: req.session.is_admin } : null;
    let data = {
        title: `Welcome ${sitename}`, // Your site name variable
        user // Include the user variable
    };
    
    const { email, password } = req.body;

    // Server-side validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.render('register', { errorMessage: 'Invalid email format', ...data });
    }

    if (password.length < 6) {
        return res.render('register', { errorMessage: 'Password must be at least 6 characters long', ...data });
    }

    try {
        // Check if the email already exists
        const exists = await exam.emailExists(email); // Assuming this returns a count
        console.log('Email existence check result:', exists); // Log the result

        // Block account creation if email exists
        if (exists > 0) {  // Ensure you're accessing the count correctly
            return res.render('register', { errorMessage: 'Email is already in use', ...data });
        }
        
        const verificationToken = await exam.addCustomer(email, password); // Get the verification token
        await exam.sendVerificationEmail(email, verificationToken); // Send the verification email

        return res.redirect('/visa');
    } catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).send('Internal Server Error');
    }
});

router.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    // Call a function to verify the token and activate the account
    const result = await verifyToken(token); // Implement this function to check the token in the database

    if (result) {
        return res.send('Email verified successfully!');
    } else {
        return res.status(400).send('Invalid token or email already verified.');
    }
});

router.get('/validate', async (req, res) => {
    const { token } = req.query; // Retrieve token from query parameters

    if (!token) {
        return res.status(400).send('Invalid token.'); // Handle case where token is missing
    }

    try {
        const isValid = await exam.verifyToken(token);

        if (isValid) {
            return res.send('Email verified successfully!'); // Success message
        } else {
            return res.status(400).send('Invalid or expired verification token.'); // Handle invalid token
        }
    } catch (error) {
        console.error('Error during verification:', error);
        return res.status(500).send('Server error occurred during verification.');
    }
});


// Route to render the check email page
router.get('/visa', (req, res) => {
    res.render('visa'); // Render the check-email view
});

router.get('/login', (req, res) => {
    const user = req.session.isLoggedIn ? {email: req.session.email, id: req.session.userId, is_admin: req.session.is_admin } : null;
    const error = null; // Initialize error as null

    res.render('login', { user, title: "Login", error }); // Pass the error variable
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
        return res.render('login', { user: null, title: 'Login', error: 'Please provide both email and password.' });
    }

    // Query the database to find the user by email
    connection.query('SELECT * FROM customer WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('login', { user: null, title: 'Login', error: 'Database error occurred. Please try again later.' });
        }

        // Check if user exists
        if (results.length === 0) {
            return res.render('login', { user: null, title: 'Login', error: 'No account with that email address was found.' });
        }

        const user = results[0];

        try {
            // Compare the provided password with the hashed password from the database
            const match = await bcryptjs.compare(password, user.password);
            if (!match) {
                return res.render('login', { user: null, title: 'Login', error: 'Incorrect password. Please try again.' });
            }

            // Check if the user's email is verified
            if (!user.verified) {
                return res.render('login', { user: null, title: 'Login', error: 'Please verify your email before logging in.' });
            }

            // Update the user's logged_in status in the database
            connection.query('UPDATE customer SET logged_in = TRUE WHERE id = ?', [user.id], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating logged_in status:', updateErr);
                    return res.render('login', { user: null, title: 'Login', error: 'Could not update login status. Please try again.' });
                }

                // Set session data
                req.session.userId = user.id;
                req.session.email = user.email;
                req.session.is_admin = user.is_admin;
                req.session.isLoggedIn = true;

                // Redirect to the dashboard
                return res.redirect('/dashboard');
            });
        } catch (error) {
            console.error('Error during password comparison:', error);
            return res.render('login', { user: null, title: 'Login', error: 'An unexpected error occurred. Please try again.' });
        }
    });
});


router.post('/logout', (req, res) => {
    const userId = req.session.userId; // Get the user's ID from the session

    // Update the logged_in status in the database
    connection.query('UPDATE customer SET logged_in = ? WHERE id = ?', [false, userId], (err, results) => {
        if (err) {
            console.error('Error updating user status:', err);
            return res.redirect('/dashboard'); // Handle the error (redirect or show a message)
        }

        // Now destroy the session
        req.session.destroy((err) => {
            if (err) {
                return res.redirect('/dashboard'); // Handle session destruction error
            }
            res.redirect('/index'); // Redirect to the homepage after logout
        });
    });
});

router.get('/dashboard', (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }

    const user = {
        email: req.session.email,
        id: req.session.userId,
        is_admin: req.session.is_admin
    };

    res.render('dashboard', { user }); 
});

router.get('/create-label', (req, res) => {
    const user = req.session.isLoggedIn ? {email: req.session.email, id: req.session.userId, is_admin: req.session.is_admin } : null; // Check if user is logged in
    res.render('create-label', { user }); // Pass the user variable to the view
});

router.post('/create-label', async (req, res) => {
    // Use userId from session instead of req.body
    const userId = req.session.userId; // Retrieve userId from session
    const { labelName, background, icons } = req.body; // Other fields remain the same
    console.log(labelName, background, icons);
    // Ensure userId is defined before proceeding
    if (!userId) {
        return res.status(400).send('User not logged in.');
    }

    try {
        const newLabelId = await exam.addLabel(userId, labelName, background, icons);
        res.redirect(`/label/${userId}/${newLabelId}`); // Redirect to the label page
    } catch (error) {
        console.error('Error adding label:', error);
        res.status(500).send('Error adding label');
    }
});

router.get('/label/:userId/:labelId', async (req, res) => {
    const { userId, labelId } = req.params;
    const user = req.session.isLoggedIn ? {email: req.session.email, id: req.session.userId, is_admin: req.session.is_admin } : null;
    try {
        console.log('User ID:', userId, 'Label ID:', labelId);
        
        // Fetch label details
        const labelDetails = await exam.getLabelDetails(labelId);

        // Generate the QR code
        const qrCodeData = `http://localhost:1337/label/${userId}/${labelId}`;
        const qrCodeUrl = await QRCode.toDataURL(qrCodeData);

        // Get the list of uploaded files (assuming you store them)
        const uploadedFiles = []; // You can replace this with actual logic to fetch previously uploaded files from a database

        // Render the EJS template with the label details, QR code, and uploaded files
        res.render('label-landing', { labelDetails, qrCodeUrl, user, uploadedFiles, title: 'Label', userId, labelId });
    } catch (error) {
        console.error('Error fetching label details:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST route for file uploads
router.post('/label/:userId/:labelId/upload', upload.array('files', 10), async (req, res) => {
    const { userId, labelId } = req.params;
    try {
        if (!req.files) {
            return res.status(400).send('No files uploaded.');
        }
        const uploadedFiles = req.files.map(file => ({
            path: `/uploads/${file.filename}`, // Path for accessing uploaded file
            type: file.mimetype,
        }));
        res.json({ uploadedFiles }); // Send back the uploaded file information
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).send('Error uploading files');
    }
});

router.get('/labels/:userId', async (req, res) => {
    const { userId } = req.params;
    const user = req.session.isLoggedIn ? {email: req.session.email, id: req.session.userId, is_admin: req.session.is_admin } : null;
    try {
        // Assuming you have a function to fetch all labels for a customer
        const labels = await exam.getCustomerLabels(userId); // Fetch all labels for the customer
        
        res.render('labels', { labels, userId ,user});
    } catch (error) {
        console.error('Error fetching customer labels:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/uploads/:userId/:labelId', (req, res) => {
    const { userId, labelId } = req.params;
    const uploadsDir = path.join('/home/blomman/iph24/uploads'); // Adjust the path to your uploads directory
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.status(500).send('Unable to scan directory: ' + err);
      }
      // Filter files that match the naming convention
      const uploadedFiles = files.filter(file => 
        file.startsWith(`${userId}${labelId}.`)
      );
      res.json(uploadedFiles); // Send the array of filenames back to the client
    });
  });

  router.get('/admin-dashboard', async (req, res) => {
    try {
        const user = req.session.isLoggedIn ? { email: req.session.email, id: req.session.userId, isAdmin: req.session.isAdmin } : null;
        
        // Fetch all customers and labels
        const customers = await exam.getAllCustomers();
        const labels = await exam.getAllLabels();
        
        res.render('admin-dashboard', { user, customers, labels });
    } catch (error) {
        console.error('Error fetching data for admin dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route for deleting a customer
router.post('/delete-customer/:id', async (req, res) => {
    const customerId = req.params.id;
    try {
        await exam.deleteCustomer(customerId); // Assuming a function for deleting customer
        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).send('Error deleting customer');
    }
});

// Route for deleting a label
router.post('/delete-label/:id', async (req, res) => {
    const labelId = req.params.id;
    try {
        await exam.deleteLabel(labelId); // Assuming a function for deleting label
        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error('Error deleting label:', error);
        res.status(500).send('Error deleting label');
    }
});

// Route for editing a customer (optional)
router.post('/edit-customer/:id', async (req, res) => {
    const customerId = req.params.id;
    const { email, is_admin, verified } = req.body;
    console.log(req.body);
    // Prepare updated data object, only including fields that have new values
    const updatedData = {
        email: email && email.trim() !== '' ? email : null,
        
        // Convert the received values into booleans
        is_admin: is_admin === 'true',  // Since it will send either 'true' or 'false'
        verified: verified === 'true'  // Same for verified
    };
    console.log(updatedData);
    try {
        // Assuming updateCustomer takes customerId and updatedData as arguments
        await exam.updateCustomer(customerId, updatedData);  
        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).send('Error updating customer');
    }
});


router.get('/profile', async (req, res) => {
    const user = req.session.isLoggedIn ? { email: req.session.email, id: req.session.userId, isAdmin: req.session.isAdmin } : null;

    if (!req.session.isLoggedIn) {
        return res.redirect('/login'); // Redirect to login if not authenticated
    }

        res.render('profile', { user, errorMessage: null }); // Pass user email to the template
});

// Route for updating email
router.post('/profile/update-email', async (req, res) => {
    console.log("Request body:", req.body);
    const email = req.body.newEmail.trim();
    const customerId = req.session.userId;
    const updatedData = {
        email: email,          // Assign the email
        is_admin: null,       // Set is_admin to null
        verified: null        // Set verified to null
    };
    console.log("Email being tested:", email, customerId);
    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(email)) {
        return res.render('profile', { user: req.session, errorMessage: 'Invalid email format' });
    }

    try {
        // Update email in the database using existing function
        await exam.updateCustomer(customerId, updatedData);

        await exam.sendUpdatedEmail(req.session.email, email);
        res.redirect('/profile'); // Redirect back to profile
    } catch (error) {
        console.error('Error updating email:', error);
        return res.status(500).send('Internal Server Error');
    }
});

// Route for deleting account
router.post('/profile/delete-account', async (req, res) => {
    const userId = req.session.userId;

    try {
        await exam.deleteCustomer(userId); // Use the existing function to delete the account
        req.session.destroy(); // Destroy the session
        res.redirect('/index'); // Redirect to homepage or login page
    } catch (error) {
        console.error('Error deleting account:', error);
        return res.status(500).send('Internal Server Error');
    }
});

router.post('/send-marketingmail', async (req, res) => {
    try {
        // Fetch all emails from the database
        const emails = await exam.getAllEmails(); // Implement this function to fetch emails
        
        // Check if any emails were retrieved
        if (emails.length === 0) {
            return res.status(404).send('No emails found in the database.');
        }

        // Send marketing email to each email address
        const promises = emails.map(email => {
            return exam.sendMarketingEmail(email); // Adjust the function if needed
        });

        // Wait for all emails to be sent
        await Promise.all(promises);

        res.status(200).send('Marketing emails sent successfully!');
    } catch (error) {
        console.error('Error sending marketing emails:', error);
        res.status(500).send('Error sending marketing emails');
    }
});

module.exports = router;