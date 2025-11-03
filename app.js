//imports
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { io } = require('socket.io-client');
const sqlite3 = require('sqlite3').verbose();
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');

//database setup
const db = new sqlite3.Database('./db/database.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to database.');
    }
});

//constants
const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'your_secret_key';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:420/oauth';
const THIS_URL = process.env.THIS_URL || `http://localhost:${PORT}`;
const API_KEY = process.env.API_KEY || 'your_api_key';

//middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    store: new SQLiteStore({ db: 'sessions.db', dir: './db' }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

function isAuthenticated(req, res, next) {

    if (req.session.user) next()
    else res.redirect('/login')
};

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// Route for the game
app.get('/', isAuthenticated, (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    if (req.query.token) {
        let tokenData = jwt.decode(req.query.token);
        console.log(tokenData);
        req.session.token = tokenData;
        req.session.user = tokenData.displayName;

        //Save user to database if not exists
        db.run('INSERT OR IGNORE INTO users (username) VALUES (?)', [tokenData.displayName], function (err) {
            if (err) {
                return console.log(err.message);
            }
            console.log(`User ${tokenData.displayName} saved to database.`);
            res.redirect('/');
        });

    } else {
        console.log('No token provided');
        res.redirect(`${AUTH_URL}/oauth?redirectURL=${THIS_URL}`);
    };
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/sendpogs', isAuthenticated, (req, res) => {
    const data = {
        from: 3,
        to: 1,
        amount: 25,
        pin: 1234,
        reason: 'test pog transfer',
    }

    console.log(data);

    console.log('Socket connected status before transfer:', socket.connected);
    socket.emit('transferDigipogs', data);
    console.log('Transfer request sent via socket');

    res.send('Pogs sent!');
});

// Make sure these middleware lines are uncommented
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Get the payment amount
app.post('/getAmount', isAuthenticated, (req, res) => {
    res.json({
        ok: true,
        amount: 25, // Your game fee
        discountEligible: false,
        discountAmount: 0
    });
});

// Handle the actual payment transfer
app.post('/transfer', isAuthenticated, (req, res) => {
    const { pin, reason } = req.body;
    const userId = req.session.token.id;

    const data = {
        from: userId,
        to: 1, // Replace with correct recipient ID
        amount: 25,
        pin: parseInt(pin),
        reason: reason || 'Game Entry Fee'
    };

    console.log('Processing payment:', data);

    // Create a promise to handle the async socket response
    const transferPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Transfer timeout'));
        }, 10000);

        // Listen for the response once
        socket.once('transferResponse', (response) => {
            clearTimeout(timeout);
            resolve(response);
        });

        // Send the transfer request
        socket.emit('transferDigipogs', data);
    });

    transferPromise
        .then(response => {
            console.log('Transfer response:', response);
            if (response.success) {
                res.json({ ok: true, message: 'Payment successful' });
            } else {
                res.json({ ok: false, error: response.message || 'Transfer failed' });
            }
        })
        .catch(error => {
            console.error('Transfer error:', error);
            res.json({ ok: false, error: 'Transfer failed' });
        });
});

// Optional: Save PIN feature
app.post('/savePin', isAuthenticated, (req, res) => {
    // For now, just return success - implement database storage if needed
    res.json({ ok: true });
});

// Optional: Get saved PIN feature  
app.post('/getPin', isAuthenticated, (req, res) => {
    // For now, return empty - implement database lookup if needed
    res.json({ ok: true, userPin: '' });
});



//socket connection to auth server
const socket = io(AUTH_URL, {
    extraHeaders: {
        api: API_KEY
    }
});

console.log('Socket connection state:', socket.connected);
console.log('Attempting to connect to:', AUTH_URL);


socket.on('connect', () => {
    console.log('Connected to auth server');
    socket.emit('getActiveClass');
    console.log('Requested active class data');

});

socket.on('connect_error', (error) => {
    console.log('Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
});

socket.on('setClass', (classData) => {
    console.log('Received class data:', classData);
    // You can store or process the class data as needed
});

// Check the transfer response
socket.on("transferResponse", (response) => {
    console.log("Received transfer response from server.");
    console.log("Transfer Response:", response);
    // response will be: { success: true/false, message: "..." }
});

socket.onAny((eventName, ...args) => {
    console.log('Received socket event:', eventName, args);
});

//start server
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});

