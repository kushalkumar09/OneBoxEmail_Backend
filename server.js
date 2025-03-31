require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Client } = require('@elastic/elasticsearch');
const passport = require('./config/passport.js');
const session = require('express-session');
const routes = require('./routes/route.js');
const { syncAllEmails } = require('./services/multiEmailSync.js');
const { syncAllUsers } = require('./services/imapSync.js');

const app = express();
app.use(express.json());

// CORS Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Secure in production
      httpOnly: true, // Prevent access from frontend JS
      sameSite: "Strict", // Prevent CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },// Change to true in production (HTTPS)
}));

app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000
})
.then(() => {
    console.log('✅ Connected to MongoDB');
})
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1); // Exit if DB connection fails
});

// Elasticsearch Client
// const esClient = new Client({ 
//     node: process.env.ELASTICSEARCH_URI || 'http://localhost:9200',
//     maxRetries: 5,
//     requestTimeout: 60000
// });

// esClient.ping()
//     .then(() => console.log('✅ Elasticsearch Connected'))
//     .catch(err => console.error('❌ Elasticsearch Connection Error:', err));

// Email Sync Initialization
syncAllUsers();

// API Routes
app.use('/api', routes);

// Sync Status Endpoint
app.get('/api/sync/status', (req, res) => {
    res.json({
        status: 'running',
        nextSync: new Date(Date.now() + (parseInt(process.env.SYNC_INTERVAL_MINUTES) || 5) * 60 * 1000)
    });
});

// Manual Sync Trigger Endpoint
app.post('/api/sync/trigger', async (req, res) => {
    try {
        const result = await syncAllEmails();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down server...');
    clearInterval(syncInterval);
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});