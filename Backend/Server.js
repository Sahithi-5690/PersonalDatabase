const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Ensure 'fs' is required
require('dotenv').config();
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Set the storage destination and filename
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Initialize multer with the correct configuration
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 200 } // Limit files to 200MB
}).any(); // Use .any() to accept any number of files with any names


app.post('/upload-file', upload, async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const tableName = req.body.tableName;
    const rowId = req.body.rowId;

    if (!tableName) {
        return res.status(400).json({ success: false, message: 'Missing table name' });
    }

    try {
        let query;
        let fieldUpdates = {}; // To store both non-file and file inputs
        let updateValues = []; // To hold the query parameters dynamically
        let updateQuery = ''; // To build the dynamic update query

        // Loop through each file and handle its upload
        for (let file of req.files) {
            const filePath = file.path;
            const mimeType = file.mimetype;
            const folderId = '1chibBqjspiuPTEbi8lVu1PitkVgExCRY'; // Your specific folder ID

            try {
                // Upload file to Google Drive
                const response = await drive.files.create({
                    requestBody: {
                        name: file.originalname, // File name on Google Drive
                        mimeType: mimeType,
                        parents: [folderId],
                    },
                    media: {
                        mimeType: mimeType,
                        body: fs.createReadStream(filePath), // Read the file from local storage
                    },
                });

                // After upload, delete the file from local storage
                fs.unlinkSync(filePath);

                // Get the uploaded file's ID and construct a URL
                const fileId = response.data.id;
                const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

                const attributeName = file.fieldname; // Use fieldname to get the correct attribute

                // Add the file URL to field updates
                fieldUpdates[attributeName] = fileUrl;

            } catch (error) {
                // Ensure the file is deleted even in case of an error
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                throw error; // Propagate the error for further handling
            }
        }

        // Add non-file inputs (from req.body) to the fieldUpdates object
        for (let [key, value] of Object.entries(req.body)) {
            // Exclude the table name and row ID from field updates
            if (key !== 'tableName' && key !== 'rowId') {
                fieldUpdates[key] = value; // Add the non-file inputs to the field updates
            }
        }

        // Check if rowId exists - update the existing row
        if (rowId) {
            updateQuery = `UPDATE ?? SET `;
            let setClauses = [];

            for (let [attributeName, attributeValue] of Object.entries(fieldUpdates)) {
                setClauses.push(`?? = ?`);
                updateValues.push(attributeName, attributeValue);
            }

            updateQuery += setClauses.join(', ') + ` WHERE id = ?`;
            updateValues.push(rowId);

            pool.query(updateQuery, [tableName, ...updateValues], (error) => {
                if (error) {
                    console.error('Error updating row:', error);
                    return res.status(500).json({ success: false, message: 'Error updating row: ' + error.message });
                }
                res.status(200).json({ success: true, message: 'Files and data uploaded and updated successfully', fieldUpdates });
            });
        } else {
            // If rowId does not exist, insert a new row with both non-file and file inputs
            const columns = Object.keys(fieldUpdates);
            const values = Object.values(fieldUpdates);

            query = `INSERT INTO ?? (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;

            pool.query(query, [tableName, ...values], (error, results) => {
                if (error) {
                    console.error('Error inserting row:', error);
                    return res.status(500).json({ success: false, message: 'Error inserting row: ' + error.message });
                }
                res.status(200).json({ success: true, message: 'Files and data uploaded and inserted successfully', fieldUpdates });
            });
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ success: false, message: 'Error uploading file to Google Drive' });
    }
});

// Database connection pool setup
const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'personaldb'
});

// Ensure connection pool is working
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
    connection.release(); // Release connection back to pool
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

// Ensure 'table_metadata' exists for storing attribute metadata
const createTableMetadata = () => {
    const query = `
    CREATE TABLE IF NOT EXISTS table_metadata (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tableName VARCHAR(255) NOT NULL,
        attributeName VARCHAR(255) NOT NULL,
        semanticType ENUM('INT', 'VARCHAR(255)', 'IMAGE', 'SONG') NOT NULL
    )`;

    pool.query(query, (err) => {
        if (err) {
            console.error('Error creating table_metadata table:', err);
        } else {
            console.log('Table_metadata table ensured.');
        }
    });
};

// Call the function on startup
createTableMetadata();


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
        let metadataInserts = [];

        attributes.forEach(attr => {
            // Adjust the attribute types to MySQL compatible types
            let dataType;
            let semanticType = attr.type; // Save the semantic type for the metatable

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
            metadataInserts.push([tableName, attr.name, semanticType]); // Collect metadata inserts
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

                // Insert metadata for each attribute
                const metadataQuery = 'INSERT INTO table_metadata (tableName, attributeName, semanticType) VALUES ?';
                pool.query(metadataQuery, [metadataInserts], (err) => {
                    if (err) {
                        console.error('Error inserting metadata:', err);
                        return sendResponse(res, 500, 'Error inserting metadata');
                    }

                    sendResponse(res, 200, 'Table and metadata created successfully');
                });
            });
        });
    });
});

// Endpoint to get the schema of a specific table, excluding the 'id' column
// Modify the /get-table-schema/:tableName endpoint
app.get('/get-table-schema/:tableName', (req, res) => {
    const tableName = req.params.tableName;

    // Fetch the schema from the MySQL table and also from the metadata table
    pool.query('SHOW COLUMNS FROM ??', [tableName], (err, results) => {
        if (err) {
            console.error('Error fetching table schema:', err);
            return sendResponse(res, 500, 'Error fetching table schema');
        }

        // Fetch the semantic types from the metadata table for this table
        pool.query('SELECT attributeName, semanticType FROM table_metadata WHERE tableName = ?', [tableName], (metaError, metaResults) => {
            if (metaError) {
                console.error('Error fetching table metadata:', metaError);
                return sendResponse(res, 500, 'Error fetching table metadata');
            }

            const semanticTypeMap = {};
            metaResults.forEach(row => {
                semanticTypeMap[row.attributeName] = row.semanticType;
            });

            // Map schema and check if semanticType exists for any attribute
            const schema = results
                .filter(row => row.Field !== 'id') // Filter out the 'id' column
                .map(row => ({
                    name: row.Field,
                    type: semanticTypeMap[row.Field] || row.Type, // Use semanticType if available
                    isNullable: row.Null === 'YES',
                    key: row.Key,
                    default: row.Default,
                    extra: row.Extra,
                }));

            sendResponse(res, 200, 'Schema fetched successfully', schema);
        });
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

        // Begin transaction to ensure both table and metadata are dropped
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('Error getting connection:', err);
                return sendResponse(res, 500, 'Database connection error');
            }

            connection.beginTransaction((err) => {
                if (err) {
                    connection.release();
                    console.error('Error starting transaction:', err);
                    return sendResponse(res, 500, 'Transaction error');
                }

                // Drop the table itself
                const dropTableQuery = `DROP TABLE IF EXISTS ${mysql.escapeId(tableName)}`;
                connection.query(dropTableQuery, (error) => {
                    if (error) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error('Error deleting table:', error);
                            return sendResponse(res, 500, 'Error deleting table');
                        });
                    }

                    // Remove the table link from user_tables
                    const deleteUserTableLinkQuery = 'DELETE FROM user_tables WHERE userId = ? AND tableName = ?';
                    connection.query(deleteUserTableLinkQuery, [userId, tableName], (err) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error('Error removing table from user_tables:', err);
                                return sendResponse(res, 500, 'Error removing table from user_tables');
                            });
                        }

                        // Remove associated metadata from table_metadata
                        const deleteMetadataQuery = 'DELETE FROM table_metadata WHERE tableName = ?';
                        connection.query(deleteMetadataQuery, [tableName], (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    console.error('Error removing metadata:', err);
                                    return sendResponse(res, 500, 'Error removing metadata');
                                });
                            }

                            // Commit the transaction if all is successful
                            connection.commit((err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        console.error('Transaction commit error:', err);
                                        return sendResponse(res, 500, 'Transaction commit error');
                                    });
                                }

                                connection.release();
                                sendResponse(res, 200, 'Category and metadata dropped successfully');
                            });
                        });
                    });
                });
            });
        });
    });
});

// Endpoint to save a row in a table
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

const util = require('util');

// Promisify the pool.query method to work with async/await
pool.query = util.promisify(pool.query);

app.put('/edit-row/:tableName/:rowId', upload, async (req, res) => {
    const tableName = req.params.tableName;
    const rowId = req.params.rowId; // Row ID to update
    const rowData = req.body; // Non-file data

    try {
        // Execute the query and get the result
        const results = await pool.query('SHOW TABLES LIKE ?', [tableName]);

        // Check if the results are empty or not
        if (!results || results.length === 0) {
            console.error('No tables found with that name:', tableName);
            return sendResponse(res, 404, 'Table not found');
        }

        // Proceed with your logic after ensuring results exist
        // Prepare the update query for non-file columns
        let columns = Object.keys(rowData); // Non-file columns
        let values = Object.values(rowData); // Non-file values

        // Handle file uploads (if any)
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const filePath = file.path;
                const mimeType = file.mimetype;
                const folderId = 'your_google_drive_folder_id'; // Replace with your folder ID

                try {
                    // Upload file to Google Drive
                    const response = await drive.files.create({
                        requestBody: {
                            name: file.originalname,
                            mimeType: mimeType,
                            parents: [folderId],
                        },
                        media: {
                            mimeType: mimeType,
                            body: fs.createReadStream(filePath),
                        },
                    });

                    // Delete the local file after upload
                    fs.unlinkSync(filePath);

                    // Get the uploaded file's ID and construct a URL
                    const fileId = response.data.id;
                    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

                    // Add file field to rowData (e.g., song or image field)
                    rowData[file.fieldname] = fileUrl;
                    columns.push(file.fieldname);
                    values.push(fileUrl);

                } catch (error) {
                    console.error('Error uploading file:', error);
                    return res.status(500).json({ success: false, message: 'Error uploading file to Google Drive' });
                }
            }
        }

        // Build the SET clause dynamically for both text and file inputs
        const setClause = columns.map(column => `${mysql.escapeId(column)} = ?`).join(', ');
        const query = `UPDATE ${mysql.escapeId(tableName)} SET ${setClause} WHERE id = ?`;

        // Add rowId to the values for WHERE clause
        values.push(rowId);

        // Execute the query
        pool.query(query, values, (error) => {
            if (error) {
                console.error('Error updating row:', error);
                return sendResponse(res, 500, 'Error updating row: ' + error.sqlMessage);
            }
            sendResponse(res, 200, 'Row updated successfully');
        });

    } catch (error) {
        console.error('Error processing request:', error);
        return sendResponse(res, 500, 'Internal server error');
    }
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
app.put('/update-category', (req, res) => {
    const { categoryName, newCategoryName, newAttributes, removeAttributes, renameAttributes, dataTypeChanges, userId } = req.body;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting database connection:', err);
            return sendResponse(res, 500, 'Database connection error');
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                console.error('Error starting transaction:', err);
                return sendResponse(res, 500, 'Transaction error');
            }

            const handleError = (error) => {
                connection.rollback(() => {
                    connection.release();
                    console.error('Error updating category:', error);
                    sendResponse(res, 500, `Error updating category: ${error.message}`);
                });
            };

            function proceedWithUpdates() {
                try {
                    const attributePromises = [];
                    if (newAttributes && newAttributes.length > 0) {
                        newAttributes.forEach(({ name, type }) => {
                            attributePromises.push(new Promise((resolve, reject) => {
                                if (!name || !type) {
                                    return reject(new Error(`Attribute name and type cannot be empty. Provided: name=${name}, type=${type}`));
                                }

                                // Map semantic types to valid MySQL data types
                                let sqlType;
                                switch (type) {
                                    case 'IMAGE':
                                    case 'SONG':
                                        sqlType = 'VARCHAR(255)';
                                        break;
                                    case 'INT':
                                        sqlType = 'INT';
                                        break;
                                    case 'VARCHAR(255)':
                                        sqlType = 'VARCHAR(255)';
                                        break;
                                    default:
                                        return reject(new Error(`Invalid attribute type: ${type}`));
                                }

                                // Check if the attribute already exists
                                const checkAttributeQuery = 'SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?';
                                connection.query(checkAttributeQuery, [process.env.DB_NAME, categoryName, name], (error, results) => {
                                    if (error) return reject(error);
                                    if (results[0].count > 0) {
                                        console.log(`Attribute "${name}" already exists in category "${categoryName}". Keeping existing attribute.`);
                                        return resolve();
                                    }

                                    // Add the new attribute if it doesn't exist
                                    const addQuery = `ALTER TABLE ?? ADD ?? ${sqlType}`;
                                    connection.query(addQuery, [categoryName, name], (error) => {
                                        if (error) return reject(error);

                                        // Add new attribute to table_metadata
                                        const insertMetaQuery = `INSERT INTO table_metadata (tableName, attributeName, semanticType) VALUES (?, ?, ?)`;
                                        connection.query(insertMetaQuery, [categoryName, name, type], (metaError) => {
                                            if (metaError) return reject(metaError);
                                            resolve();
                                        });
                                    });
                                });
                            }));
                        });
                    }

                    Promise.all(attributePromises).then(() => proceedWithOtherUpdates()).catch(handleError);
                } catch (error) {
                    handleError(error);
                }
            }

            function proceedWithOtherUpdates() {
                try {
                    const renamePromises = [];
                    const dataTypePromises = [];
                    const removePromises = [];

                    // Handle renaming attributes
                    if (renameAttributes && renameAttributes.length > 0) {
                        renameAttributes.forEach(({ oldName, newName }) => {
                            if (!oldName || !newName) {
                                throw new Error(`Attribute names cannot be empty. oldName=${oldName}, newName=${newName}`);
                            }
                            const renameQuery = 'ALTER TABLE ?? CHANGE ?? ?? VARCHAR(255)';
                            renamePromises.push(new Promise((resolve, reject) => {
                                connection.query(renameQuery, [categoryName, oldName, newName], (error) => {
                                    if (error) return reject(error);

                                    // Update table_metadata with new attribute name
                                    const updateMetaQuery = `UPDATE table_metadata SET attributeName = ? WHERE tableName = ? AND attributeName = ?`;
                                    connection.query(updateMetaQuery, [newName, categoryName, oldName], (metaError) => {
                                        if (metaError) return reject(metaError);
                                        resolve();
                                    });
                                });
                            }));
                        });
                    }

                    // Handle changing attribute data types
                    if (dataTypeChanges && dataTypeChanges.length > 0) {
                        dataTypeChanges.forEach(({ name, newType }) => {
                            if (!name || !newType) {
                                throw new Error(`Attribute name and new type cannot be empty. Provided: name=${name}, newType=${newType}`);
                            }

                            let sqlType;
                            switch (newType) {
                                case 'IMAGE':
                                case 'SONG':
                                case 'VARCHAR(255)':
                                    sqlType = 'VARCHAR(255)';
                                    break;
                                case 'INT':
                                    sqlType = 'INT';
                                    break;
                                default:
                                    throw new Error(`Unsupported data type: ${newType}`);
                            }

                            const alterQuery = `ALTER TABLE ?? MODIFY ?? ${sqlType}`;
                            dataTypePromises.push(new Promise((resolve, reject) => {
                                connection.query(alterQuery, [categoryName, name], (error) => {
                                    if (error) return reject(error);

                                    // Update table_metadata with new semanticType
                                    const updateMetaQuery = `UPDATE table_metadata SET semanticType = ? WHERE tableName = ? AND attributeName = ?`;
                                    connection.query(updateMetaQuery, [newType, categoryName, name], (metaError) => {
                                        if (metaError) return reject(metaError);
                                        resolve();
                                    });
                                });
                            }));
                        });
                    }

                    // Handle removing attributes
                    if (removeAttributes && removeAttributes.length > 0) {
                        removeAttributes.forEach((attr) => {
                            const dropQuery = 'ALTER TABLE ?? DROP COLUMN ??';
                            const metaDeleteQuery = 'DELETE FROM table_metadata WHERE tableName = ? AND attributeName = ?';
                            removePromises.push(new Promise((resolve, reject) => {
                                connection.query(dropQuery, [categoryName, attr], (error) => {
                                    if (error) return reject(error);

                                    // Remove from table_metadata
                                    connection.query(metaDeleteQuery, [categoryName, attr], (metaError) => {
                                        if (metaError) return reject(metaError);
                                        resolve();
                                    });
                                });
                            }));
                        });
                    }

                    Promise.all([...renamePromises, ...dataTypePromises, ...removePromises])
                        .then(() => proceedWithCategoryRename())
                        .catch(handleError);
                } catch (error) {
                    handleError(error);
                }
            }

            function proceedWithCategoryRename() {
                if (newCategoryName && newCategoryName !== categoryName) {
                    const renameCategoryQuery = 'ALTER TABLE ?? RENAME TO ??';
                    connection.query(renameCategoryQuery, [categoryName, newCategoryName], (error) => {
                        if (error) return handleError(error);
                        commitTransaction();
                    });
                } else {
                    commitTransaction();
                }
            }

            function commitTransaction() {
                connection.commit((err) => {
                    if (err) {
                        connection.rollback(() => {
                            connection.release();
                            console.error('Transaction rollback:', err);
                        });
                        return sendResponse(res, 500, 'Transaction error');
                    }
                    connection.release();
                    sendResponse(res, 200, 'Category updated successfully');
                });
            }

            proceedWithUpdates();
        });
    });
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
