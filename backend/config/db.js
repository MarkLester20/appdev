const mysql = require('mysql');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gc.co'
});

db.connect((error) => {
    if (error) {
        console.error('Error connecting to database:', error);
        process.exit(1); // Exit on failure to connect
    } else {
        console.log('Connected to database');
    }
});

module.exports = db;