const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const { check, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // Parses JSON request bodies

// Database connection pool setup
const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'personaldb'
});

// Ensure connection pool is working
pool.getConnection((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

// Middleware to check if user exists
const checkUserExists = (req, res, next) => {
    const userId = req.body.userId || req.query.userId;
    pool.query('SELECT * FROM user WHERE userId = ?', [userId], (error, results) => {
        if (error || results.length === 0) {
            console.error('User not found:', error);
            return sendResponse(res, 400, 'User not found');
        }
        next();
    });
};

// Create 'user' table if it doesn't exist
const createUserTable = () => {
    const query = `
    CREATE TABLE IF NOT EXISTS user (
        userId VARCHAR(255) PRIMARY KEY,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE
    )`;

    pool.query(query, (err) => {
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

    pool.query(query, (err) => {
        if (err) {
            console.error('Error creating user_tables table:', err);
        } else {
            console.log('User_tables table ensured.');
        }
    });
};

// Endpoint to add a new user to the database
app.post('/add-user', [
    check('userId').notEmpty().withMessage('UserId is required'),
    check('firstName').notEmpty().withMessage('First name is required'),
    check('lastName').notEmpty().withMessage('Last name is required'),
    check('email').isEmail().withMessage('Valid email is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendResponse(res, 400, 'Validation errors', errors.array());
    }

    const { userId, firstName, lastName, email } = req.body;

    // Insert the new user into the 'user' table
    const query = 'INSERT INTO user (userId, firstName, lastName, email) VALUES (?, ?, ?, ?)';
    pool.query(query, [userId, firstName, lastName, email], (error) => {
        if (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return sendResponse(res, 400, 'User with this email already exists');
            }
            console.error('Error inserting user:', error);
            return sendResponse(res, 500, 'Error inserting user: ' + error.message);
        }
        sendResponse(res, 200, 'User added successfully');
    });
});

// Ensure necessary tables are created on startup
createUserTable();
createUserTablesTable();

// Test endpoint
app.get('/', (req, res) => {
    res.json("From Backend");
});

// Middleware for centralized error handling
const errorHandler = (err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Internal Server Error' });
};

// Use error handling middleware
app.use(errorHandler);

// Standardized response function
const sendResponse = (res, status, message, data = null) => {
    res.status(status).json({ success: status < 400, message, data });
};

// Endpoint to get table names for a user
app.get('/tables', (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return sendResponse(res, 400, 'UserId is required');
    }

    // Fetch tables linked to the user
    pool.query('SELECT tableName FROM user_tables WHERE userId = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user tables:', err);
            return sendResponse(res, 500, 'Error fetching user tables');
        }
        const tables = results.map(row => row.tableName) || [];
        sendResponse(res, 200, 'Tables fetched successfully', tables);
    });
});

// Endpoint to create a new table for a user
app.post('/create-table', [
    check('tableName').notEmpty().withMessage('Table name is required'),
    check('attributes').isArray().withMessage('Attributes must be an array'),
    check('userId').notEmpty().withMessage('UserId is required'),
    check('attributes.*.name').isString().withMessage('Attribute name must be a string'),
    check('attributes.*.type').isString().withMessage('Attribute type must be a string'),
], checkUserExists, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendResponse(res, 400, 'Validation errors', errors.array());
    }

    const { tableName, attributes, userId } = req.body;

    // Check if the table already exists
    pool.query('SHOW TABLES LIKE ?', [tableName], (error, results) => {
        if (error) {
            console.error('Error checking table existence:', error);
            return sendResponse(res, 500, 'Error checking table existence');
        }
        if (results.length > 0) {
            return sendResponse(res, 400, 'Table already exists');
        }

        // Dynamically generate SQL query for creating a new table
        let query = `CREATE TABLE ${mysql.escapeId(tableName)} (id INT AUTO_INCREMENT PRIMARY KEY, `;
        
        attributes.forEach(attr => {
            // Adjust the attribute types to MySQL compatible types
            let dataType;
            switch (attr.type) {
                case 'INT':
                    dataType = 'INT';
                    break;
                case 'VARCHAR(255)':
                    dataType = 'VARCHAR(255)';
                    break;
                case 'IMAGE':
                case 'SONG':
                    dataType = 'VARCHAR(255)'; // Store paths or identifiers as VARCHAR
                    break;
                default:
                    return sendResponse(res, 400, `Invalid attribute type: ${attr.type}`);
            }
            query += `${mysql.escapeId(attr.name)} ${dataType}, `;
        });
        
        query = query.slice(0, -2) + ')'; // Remove trailing comma and space

        // Create the table
        pool.query(query, (error) => {
            if (error) {
                console.error('Error creating table:', error);
                return sendResponse(res, 500, 'Error creating table');
            }

            // Insert table metadata into user_tables
            pool.query('INSERT INTO user_tables (userId, tableName) VALUES (?, ?)', [userId, tableName], (err) => {
                if (err) {
                    console.error('Error linking table to user:', err);
                    return sendResponse(res, 500, 'Error linking table to user');
                }
                sendResponse(res, 200, 'Table created and linked successfully');
            });
        });
    });
});


// Endpoint to get the schema of a specific table, excluding the 'id' column
app.get('/get-table-schema/:tableName', (req, res) => {
    const tableName = req.params.tableName;

    // Use the SHOW COLUMNS command to fetch the schema
    pool.query('SHOW COLUMNS FROM ??', [tableName], (err, results) => {
        if (err) {
            console.error('Error fetching table schema:', err);
            return sendResponse(res, 500, 'Error fetching table schema');
        }

        // Extract column names and data types from the results, excluding 'id'
        const schema = results
            .filter(row => row.Field !== 'id') // Filter out the 'id' column
            .map(row => ({
                name: row.Field,
                type: row.Type,
                isNullable: row.Null === 'YES',
                key: row.Key,
                default: row.Default,
                extra: row.Extra,
            }));

        sendResponse(res, 200, 'Schema fetched successfully', schema);
    });
});


// Endpoint to get column names and data types for a specific table
app.get('/table/columns/:tableName', (req, res) => {
    const tableName = req.params.tableName;

    pool.query('SHOW COLUMNS FROM ??', [tableName], (err, results) => {
        if (err) {
            console.error('Error fetching column names:', err);
            return sendResponse(res, 500, 'Error fetching column names');
        }

        // Extract column names and data types from the results
        const columns = results.map(row => ({
            name: row.Field,
            type: row.Type,
        }));
        sendResponse(res, 200, 'Column names and types fetched successfully', columns);
    });
});

// Endpoint to delete a row from a specific table
app.delete('/delete-row/:tableName/:rowId', (req, res) => {
    const tableName = req.params.tableName;
    const rowId = req.params.rowId; // Assuming the row ID is passed as a URL parameter

    // Check if the table exists
    pool.query('SHOW TABLES LIKE ?', [tableName], (error, results) => {
        if (error) {
            console.error('Error checking table existence:', error);
            return sendResponse(res, 500, 'Error checking table existence');
        }
        if (results.length === 0) {
            return sendResponse(res, 404, 'Table not found');
        }

        // Prepare the delete query (assuming the primary key is named 'id')
        const query = `DELETE FROM ${mysql.escapeId(tableName)} WHERE id = ?`;

        pool.query(query, [rowId], (error) => {
            if (error) {
                console.error('Error deleting row:', error);
                return sendResponse(res, 500, 'Error deleting row');
            }

            sendResponse(res, 200, 'Row deleted successfully');
        });
    });
});


// Updated endpoint to delete a table, ensuring the user exists
app.delete('/drop-table', checkUserExists, (req, res) => {
    const { tableName, userId } = req.body; // Expecting tableName and userId in the request body

    // Check if the table exists before attempting to delete
    pool.query('SHOW TABLES LIKE ?', [tableName], (error, results) => {
        if (error) {
            console.error('Error checking table existence:', error);
            return sendResponse(res, 500, 'Error checking table existence');
        }
        if (results.length === 0) {
            return sendResponse(res, 404, 'Table not found');
        }

        pool.query(`DROP TABLE IF EXISTS ${mysql.escapeId(tableName)}`, (error) => {
            if (error) {
                console.error('Error deleting table:', error);
                return sendResponse(res, 500, 'Error deleting table');
            }

            // Remove the table link from user_tables
            pool.query('DELETE FROM user_tables WHERE userId = ? AND tableName = ?', [userId, tableName], (err) => {
                if (err) {
                    console.error('Error removing table from user_tables:', err);
                    return sendResponse(res, 500, 'Error removing table from user_tables');
                }
                sendResponse(res, 200, 'Table deleted successfully');
            });
        });
    });
});


app.post('/save-row/:tableName', (req, res) => {
    const tableName = req.params.tableName;
    const rowData = req.body;

    // Check if the table exists
    pool.query('SHOW TABLES LIKE ?', [tableName], (error, results) => {
        if (error) {
            console.error('Error checking table existence:', error);
            return sendResponse(res, 500, 'Error checking table existence');
        }
        if (results.length === 0) {
            console.error('Table not found:', tableName);
            return sendResponse(res, 404, 'Table not found');
        }

        // Prepare the insert query
        const columns = Object.keys(rowData);
        const values = Object.values(rowData);
        const placeholders = columns.map(() => '?').join(', '); // Create placeholders for values
        const query = `INSERT INTO ${mysql.escapeId(tableName)} (${columns.join(', ')}) VALUES (${placeholders})`;

        pool.query(query, values, (error) => {
            if (error) {
                console.error('Error inserting row:', error);
                return sendResponse(res, 500, 'Error inserting row: ' + error.sqlMessage);
            }
            sendResponse(res, 200, 'Row inserted successfully');
        });
    });
});
// Endpoint to edit a row in a specific table
app.put('/edit-row/:tableName/:rowId', (req, res) => {
    const tableName = req.params.tableName;
    const rowId = req.params.rowId; // Assuming the row ID is passed as a URL parameter
    const rowData = req.body; // Data to update

    // Check if the table exists
    pool.query('SHOW TABLES LIKE ?', [tableName], (error, results) => {
        if (error) {
            console.error('Error checking table existence:', error);
            return sendResponse(res, 500, 'Error checking table existence');
        }
        if (results.length === 0) {
            console.error('Table not found:', tableName);
            return sendResponse(res, 404, 'Table not found');
        }

        // Prepare the update query
        const columns = Object.keys(rowData);
        const values = Object.values(rowData);
        const setClause = columns.map(column => `${mysql.escapeId(column)} = ?`).join(', '); // Create SET clause
        const query = `UPDATE ${mysql.escapeId(tableName)} SET ${setClause} WHERE id = ?`; // Assuming the primary key is named 'id'

        // Include rowId in the values for the query
        values.push(rowId);

        pool.query(query, values, (error) => {
            if (error) {
                console.error('Error updating row:', error);
                return sendResponse(res, 500, 'Error updating row: ' + error.sqlMessage);
            }
            sendResponse(res, 200, 'Row updated successfully');
        });
    });
});

// Endpoint to get a specific row from a specific table by row ID
app.get('/get-row/:tableName/:rowId', (req, res) => {
    const tableName = req.params.tableName;
    const rowId = req.params.rowId;

    // Check if the table exists
    pool.query('SHOW TABLES LIKE ?', [tableName], (error, results) => {
        if (error) {
            console.error('Error checking table existence:', error);
            return sendResponse(res, 500, 'Error checking table existence');
        }
        if (results.length === 0) {
            return sendResponse(res, 404, 'Table not found');
        }

        // Fetch the row with the specified ID
        const query = `SELECT * FROM ${mysql.escapeId(tableName)} WHERE id = ?`;
        pool.query(query, [rowId], (error, rows) => {
            if (error) {
                console.error('Error fetching row:', error);
                return sendResponse(res, 500, 'Error fetching row');
            }
            if (rows.length === 0) {
                return sendResponse(res, 404, 'Row not found');
            }
            sendResponse(res, 200, 'Row fetched successfully', rows[0]); // Send the first row only
        });
    });
});


// Endpoint to get rows from a specific table
app.get('/get-rows/:tableName', (req, res) => {
    const tableName = req.params.tableName;

    // Check if the table exists
    pool.query('SHOW TABLES LIKE ?', [tableName], (error, results) => {
        if (error) {
            console.error('Error checking table existence:', error);
            return sendResponse(res, 500, 'Error checking table existence');
        }
        if (results.length === 0) {
            return sendResponse(res, 404, 'Table not found');
        }

        // Fetch rows from the table
        pool.query(`SELECT * FROM ${mysql.escapeId(tableName)}`, (error, rows) => {
            if (error) {
                console.error('Error fetching rows:', error);
                return sendResponse(res, 500, 'Error fetching rows');
            }
            sendResponse(res, 200, 'Rows fetched successfully', rows);
        });
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
