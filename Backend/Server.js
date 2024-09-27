const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const { check, validationResult } = require('express-validator'); // For validation

const app = express();
app.use(cors());
app.use(express.json()); // Parses JSON request bodies

// Database connection setup
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'personaldb'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

// Create 'user' table if it doesn't exist
const createUserTable = () => {
    const query = `
    CREATE TABLE IF NOT EXISTS user (
        userId VARCHAR(255) PRIMARY KEY,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE
    )`;
    
    db.query(query, (err) => {
        if (err) {
            console.error('Error creating user table:', err);
        } else {
            console.log('User table ensured.');
        }
    });
};

// Ensure 'user_tables' exists for tracking user-created tables
const createUserTablesTable = () => {
    const query = `
    CREATE TABLE IF NOT EXISTS user_tables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        tableName VARCHAR(255) NOT NULL,
        FOREIGN KEY (userId) REFERENCES user(userId)
    )`;

    db.query(query, (err) => {
        if (err) {
            console.error('Error creating user_tables table:', err);
        } else {
            console.log('User_tables table ensured.');
        }
    });
};

// Ensure necessary tables are created on startup
createUserTable();
createUserTablesTable();

// Test endpoint
app.get('/', (req, res) => {
    res.json("From Backend");
});

// Endpoint to get table names for a user
app.get('/tables', [
    check('userId').notEmpty().withMessage('UserId is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.query.userId;

    // Fetch tables linked to the user
    db.query('SELECT tableName FROM user_tables WHERE userId = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user tables:', err);
            return res.status(500).json({ error: 'Error fetching user tables' });
        }
        const tables = results.map(row => row.tableName);
        res.json(tables);
    });
});

// Endpoint to create a new table for a user
app.post('/create-table', [
    check('tableName').notEmpty().withMessage('Table name is required'),
    check('attributes').isArray().withMessage('Attributes must be an array'),
    check('userId').notEmpty().withMessage('UserId is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { tableName, attributes, userId } = req.body;

    // Validate user
    db.query('SELECT * FROM user WHERE userId = ?', [userId], (error, results) => {
        if (error || results.length === 0) {
            console.error('User not found:', error);
            return res.status(400).json({ error: 'User not found' });
        }

        // Check if the table already exists
        db.query('SHOW TABLES LIKE ?', [tableName], (error, results) => {
            if (error) {
                console.error('Error checking table existence:', error);
                return res.status(500).json({ error: 'Error checking table existence' });
            }
            if (results.length > 0) {
                return res.status(400).json({ error: 'Table already exists' });
            }

            // Dynamically generate SQL query for creating a new table
            let query = `CREATE TABLE ${mysql.escapeId(tableName)} (id INT AUTO_INCREMENT PRIMARY KEY, `;
            attributes.forEach(attr => {
                query += `${mysql.escapeId(attr.name)} ${attr.type}, `;
            });
            query = query.slice(0, -2); // Remove trailing comma and space
            query += ')';

            // Create the table
            db.query(query, (error) => {
                if (error) {
                    console.error('Error creating table:', error);
                    return res.status(500).json({ error: 'Error creating table' }); // Return JSON
                }

                // Insert table metadata into user_tables
                db.query('INSERT INTO user_tables (userId, tableName) VALUES (?, ?)', [userId, tableName], (err) => {
                    if (err) {
                        console.error('Error linking table to user:', err);
                        return res.status(500).json({ error: 'Error linking table to user' }); // Return JSON
                    }
                    res.status(200).json({ message: 'Table created and linked successfully' }); // Return JSON
                });
            });
        });
    });
});

// Endpoint to delete a table
app.delete('/delete-table/:tableName', (req, res) => {
    const { tableName } = req.params;

    db.query(`DROP TABLE IF EXISTS ${mysql.escapeId(tableName)}`, (error) => {
        if (error) {
            console.error('Error deleting table:', error);
            return res.status(500).json({ error: 'Error deleting table' }); // Return JSON
        }

        // Remove the table link from user_tables
        db.query('DELETE FROM user_tables WHERE tableName = ?', [tableName], (err) => {
            if (err) {
                console.error('Error unlinking table from user:', err);
                return res.status(500).json({ error: 'Error unlinking table from user' }); // Return JSON
            }
            res.status(200).json({ message: 'Table deleted successfully' }); // Return JSON
        });
    });
});

// Endpoint to get data from any table
app.get('/table/:name', (req, res) => {
    const tableName = req.params.name;

    // Query to select all data from the specified table
    const sql = 'SELECT * FROM ??';
    db.query(sql, [tableName], (err, results) => {
        if (err) {
            console.error('Error fetching table data:', err);
            return res.status(500).json({ error: 'Error fetching table data' }); // Return JSON
        }
        res.json(results);
    });
});

// Endpoint to add a new user to the database
app.post('/add-user', [
    check('userId').notEmpty().withMessage('UserId is required'),
    check('firstName').notEmpty().withMessage('First name is required'),
    check('lastName').notEmpty().withMessage('Last name is required'),
    check('email').isEmail().withMessage('Valid email is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, firstName, lastName, email } = req.body;

    const sql = `INSERT INTO user (userId, firstName, lastName, email) VALUES (?, ?, ?, ?)`;

    db.query(sql, [userId, firstName, lastName, email], (err) => {
        if (err) {
            console.error('Error inserting user into database:', err);
            return res.status(500).json({ error: 'Failed to insert user into database' }); // Return JSON
        }
        res.status(200).json({ message: 'User added successfully' }); // Return JSON
    });
});

// Endpoint to handle logout
app.post('/logout', (req, res) => {
    // Example: req.session.destroy() or token invalidation logic
    res.json({ message: 'Logged out successfully' }); // Return JSON
});

// Server listening on port 8081
app.listen(8081, () => {
    console.log("Listening on port 8081");
});
