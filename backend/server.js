const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const itemRoutes = require('./routes/itemRoutes');
const db = require('./config/db');
const cartRoutes = require('./routes/cartRoutes')

const server = express();
const PORT = process.env.PORT || 3000;

// Middleware
server.use(cors({
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(session({
    secret: process.env.SESSION_SECRET || 'defaultSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));
server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging middleware
server.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
server.use('/api/user', userRoutes);
server.use('/api/admin', adminRoutes);
server.use('/api/items', itemRoutes);
server.use('/api/cart', cartRoutes);

// Error handling middleware
server.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error in ${req.method} ${req.url}:`, err);
    res.status(500).send({ status: false, message: 'Internal server error' });
});

// Start server
server.listen(PORT, (error) => {
    if (error) {
        console.error('Error starting server:', error);
    } else {
        console.log(`Server started on port ${PORT}`);
    }
});