const mysql = require('mysql');

// MySQL connection configuration
const dbOptions = {
    host: "MSI.local",
    user: "dbadm",
    password: "P@ssw0rd",
    database: "iLabel",
    port: 1337
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
