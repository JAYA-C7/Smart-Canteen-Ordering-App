const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Check whether MySQL is accessible
db.getConnection((err, connection) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }

    console.log("Connected to MySQL successfully!");

    // Return the connection to the pool
    connection.release();
});

module.exports = db;