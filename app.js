//imports
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { io } = require('socket.io-client');
const sqlite3 = require('sqlite3').verbose();
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const { log } = require('console');

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
const PORT = process.env.PORT || 3500;
const SESSION_SECRET = process.env.SESSION_SECRET || 'your_secret_key';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:420/oauth';
const THIS_URL = process.env.THIS_URL || `http://localhost:${PORT}`;
const API_KEY = process.env.API_KEY || 'your_api_key';
const gameSessions = new Map(); // sessionId -> gameData

//global variables


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
        req.session.hasPaid = false;

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

// Make sure these middleware lines are uncommented
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/payIn', isAuthenticated, (req, res) => {
    res.render('pay', { user: req.session.user });
});

// Handle the actual payment transfer
app.post('/payIn', isAuthenticated, (req, res) => {
    const { pin } = req.body;
    const userId = req.session.token.id;

    const data = {
        from: userId,
        to: 1, // Replace with 17 when running official server
        amount: 1,
        pin: parseInt(pin),
        reason: 'Game Entry Fee',
        // pool: 'true' uncomment for official server use
    };

    console.log('Processing payment:', data);

    const transferPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Transfer timeout'));
        }, 10000);

        socket.once('transferResponse', (response) => {
            clearTimeout(timeout);
            resolve(response);
        });

        socket.emit('transferDigipogs', data);
    });

    transferPromise
        .then(response => {
            console.log('Transfer response:', response);
            if (response.success) {
                req.session.hasPaid = true;

                console.log('=== Payment Success Debug ===');
                console.log('Session ID after payment:', req.sessionID);
                console.log('req.session.hasPaid after setting:', req.session.hasPaid);
                console.log('==============================');

                // Save session BEFORE responding
                req.session.save((err) => {
                    if (err) {
                        console.error('Session save error:', err);
                        return res.json({ ok: false, error: 'Session save failed' });
                    }

                    console.log('Session saved successfully');
                    console.log('Sending success response to client');
                    res.json({ ok: true, message: 'Payment successful' });
                });
            } else {
                console.log('Sending failure response to client:', response.message);
                res.json({ ok: false, error: response.message || 'Transfer failed' });
            }
        })
        .catch(error => {
            console.error('Transfer error:', error);
            res.json({ ok: false, error: 'Transfer failed' });
        });
});

app.post('/checkGameAccess', isAuthenticated, (req, res) => {
    const existingSession = gameSessions.get(req.sessionID);

    // Check if user has active game session or valid payment
    if (req.session.hasPaid || (existingSession && existingSession.active)) {
        res.json({ needsPayment: false });
    } else {
        res.json({ needsPayment: true, cost: 25 });
    }
});

// Start game session endpoint
app.post('/startGameSession', isAuthenticated, (req, res) => {
    if (!req.session.hasPaid) {
        return res.json({ ok: false, error: 'Payment required' });
    }

    // Create server-controlled game session
    const gameSession = {
        sessionId: req.sessionID,
        userId: req.session.token.id,
        startTime: Date.now(),
        currentWave: 1,
        wavesCompleted: 0,
        totalScore: 0,
        payoutEarned: 0,
        active: true,
        lastActivity: Date.now()
    };

    gameSessions.set(req.sessionID, gameSession);

    // Clear payment flag since game is starting
    req.session.hasPaid = false;

    console.log(`Game session started for user ${req.session.user}`);
    res.json({ ok: true, sessionId: req.sessionID });
});

// Validate and record game events
app.post('/recordGameEvent', isAuthenticated, (req, res) => {
    const { eventType, data } = req.body;
    const gameSession = gameSessions.get(req.sessionID);

    if (!checkRateLimit(req.sessionID)) {
        return res.json({ ok: false, error: 'Rate limit exceeded' });
    }
    if (!gameSession || !gameSession.active) {
        return res.json({ ok: false, error: 'No active game session' });
    }

    gameSession.lastActivity = Date.now();

    switch (eventType) {
        case 'WAVE_COMPLETE':
            return handleWaveComplete(gameSession, data, res);
        case 'SCORE_UPDATE':
            return handleScoreUpdate(gameSession, data, res);
        default:
            return res.json({ ok: false, error: 'Unknown event type' });
    }
});

// Handle wave completion with anti-cheat validation
function handleWaveComplete(gameSession, data, res) {
    const { waveNumber, timeTaken, scoreGained } = data;

    // Validate wave progression
    if (waveNumber !== gameSession.currentWave) {
        console.log(`Cheating detected: Wave skip attempt by user ${gameSession.userId}`);
        endGameSession(gameSession.sessionId, 'CHEATING_DETECTED');
        return res.json({ ok: false, error: 'Invalid wave progression' });
    }

    // Validate timing (prevent impossible speeds)
    const minWaveTime = 0; // 0 milliseconds minimum per wave
    const maxWaveTime = 180000000000; // 30 minutes maximum per wave

    if (timeTaken < minWaveTime || timeTaken > maxWaveTime) {
        console.log(`Suspicious timing: ${timeTaken}ms for wave ${waveNumber}`);
        endGameSession(gameSession.sessionId, 'SUSPICIOUS_TIMING');
        return res.json({ ok: false, error: 'Invalid timing' });
    }

    // Validate score gains (prevent impossible scores)
    const maxScorePerWave = 1000; // Adjust based on your game
    if (scoreGained > maxScorePerWave) {
        console.log(`Impossible score gain: ${scoreGained} in wave ${waveNumber}`);
        endGameSession(gameSession.sessionId, 'IMPOSSIBLE_SCORE');
        return res.json({ ok: false, error: 'Invalid score' });
    }

    // ... rest of your existing code
    
    
    // Validate wave progression
    if (waveNumber !== gameSession.currentWave) {
        console.log(`Cheating detected: Wave skip attempt by user ${gameSession.userId}`);
        endGameSession(gameSession.sessionId, 'CHEATING_DETECTED');
        return res.json({ ok: false, error: 'Invalid wave progression' });
    }
    
    // Update server-side game state
    gameSession.currentWave = waveNumber + 1;
    gameSession.wavesCompleted = waveNumber;
    gameSession.totalScore += scoreGained;
    
    // Calculate payout SERVER-SIDE ONLY
    if (waveNumber % 5 === 0) {
        gameSession.payoutEarned += 3; // Server controls payout calculation
        console.log(`Wave ${waveNumber} payout earned. Total: ${gameSession.payoutEarned}`);
    }
    
    res.json({
        ok: true,
        nextWave: gameSession.currentWave,
        totalPayout: gameSession.payoutEarned,
        serverScore: gameSession.totalScore
    });
}

// End game and process payout
app.post('/endGame', isAuthenticated, (req, res) => {
    const gameSession = gameSessions.get(req.sessionID);

    if (!gameSession) {
        return res.json({ ok: false, error: 'No active game session' });
    }

    const finalPayout = gameSession.payoutEarned;

    // Log game completion
    console.log(`Game ended for user ${gameSession.userId}:`, {
        wavesCompleted: gameSession.wavesCompleted,
        finalScore: gameSession.totalScore,
        payout: finalPayout,
        duration: Date.now() - gameSession.startTime
    });

    // Remove game session
    gameSessions.delete(req.sessionID);

    // Process payout if earned
    if (finalPayout > 0) {
        processPayout(req.session.token.id, finalPayout)
            .then(success => {
                if (success) {
                    res.json({ ok: true, payout: finalPayout });
                } else {
                    res.json({ ok: false, error: 'Payout failed' });
                }
            });
    } else {
        res.json({ ok: true, payout: 0 });
    }
});

// Secure payout processing
async function processPayout(userId, amount) {
    const data = {
        from: 1, // Your game account
        to: userId,
        amount: amount, // Server-calculated amount only
        pin: 2018, // Your server PIN
        reason: 'Game Winnings - Server Verified'
    };

    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 10000);

        socket.once('transferResponse', (response) => {
            clearTimeout(timeout);
            console.log('Payout result:', response);
            resolve(response.success);
        });

        socket.emit('transferDigipogs', data);
    });
}

function endGameSession(sessionId, reason) {
    const session = gameSessions.get(sessionId);
    if (session) {
        console.log(`Ending game session ${sessionId}: ${reason}`);
        gameSessions.delete(sessionId);
    }
}

// Add periodic cleanup of stale sessions
setInterval(() => {
    const now = Date.now();
    const maxInactiveTime = 5 * 60 * 1000; // 5 minutes

    for (const [sessionId, gameSession] of gameSessions.entries()) {
        if (now - gameSession.lastActivity > maxInactiveTime) {
            console.log(`Cleaning up inactive session: ${sessionId}`);
            gameSessions.delete(sessionId);
        }
    }
}, 60000); // Check every minute

// Add rate limiting
const rateLimits = new Map(); // sessionId -> { requests: number, resetTime: timestamp }

function checkRateLimit(sessionId) {
    const now = Date.now();
    const limit = rateLimits.get(sessionId) || { requests: 0, resetTime: now + 60000 };

    if (now > limit.resetTime) {
        limit.requests = 0;
        limit.resetTime = now + 60000;
    }

    limit.requests++;
    rateLimits.set(sessionId, limit);

    return limit.requests < 100; // Max 100 requests per minute
}

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