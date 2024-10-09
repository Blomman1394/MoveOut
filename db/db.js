const mysql = require('mysql');

// MySQL connection configuration
const dbOptions = {
    host: process.env.DB_HOST,       // use the environment variable
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: 3306,                       // default MySQL port
    multipleStatements: true
};

// Create a connection pool
const pool = mysql.createPool(dbOptions);

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        return;
    }
    console.log('Connected to the database as ID', connection.threadId);
    connection.release(); // Release the connection back to the pool
});

// Export the pool
module.exports = pool;
