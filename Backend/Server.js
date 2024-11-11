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

// Add token generation endpoints here
app.get('/generate-token', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive'],
    });
    res.send(`Authorize this app by visiting this URL: <a href="${authUrl}" target="_blank">${authUrl}</a>`);
});

app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('Missing authorization code');
    }
    try {
        const { tokens } = await oauth2Client.getToken(code);
        res.json(tokens);
    } catch (error) {
        console.error('Error retrieving access token:', error);
        res.status(500).send('Error retrieving access token');
    }
});

app.post('/upload-file', upload, async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const tableName = req.body.tableName;
    const rowId = req.body.rowId;

    if (!tableName) {
        return res.status(400).json({ success: false, message: 'Missing table name' });
    }

    // Reject if `rowId` is provided, since this endpoint is for insertion only
    if (rowId) {
        return res.status(400).json({ success: false, message: 'Updates not allowed in upload-file. Use edit-row for updates.' });
    }

    try {
        const fieldUpdates = {};

        // Handle file uploads
        for (let file of req.files) {
            const filePath = file.path;
            const mimeType = file.mimetype;
            const folderId = '1chibBqjspiuPTEbi8lVu1PitkVgExCRY';

            try {
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

                fs.unlinkSync(filePath);

                const fileId = response.data.id;
                const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
                const attributeName = file.fieldname;

                fieldUpdates[attributeName] = fileUrl;

            } catch (error) {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                throw error;
            }
        }

        // Add non-file inputs (from req.body) to fieldUpdates, excluding 'id'
        for (let [key, value] of Object.entries(req.body)) {
            if (key !== 'tableName' && key !== 'rowId' && key !== 'id') {
                fieldUpdates[key] = value;
            }
        }

        // Insert a new row without specifying 'id'
        const columns = Object.keys(fieldUpdates);
        const values = Object.values(fieldUpdates);
        const query = `INSERT INTO ${mysql.escapeId(tableName)} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;

        await pool.query(query, values);

        res.status(200).json({ success: true, message: 'New row inserted successfully', fieldUpdates });

    } catch (error) {
        console.error('Error inserting row:', error);
        res.status(500).json({ success: false, message: 'Error inserting row' });
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
        semanticType VARCHAR(255) NOT NULL
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

app.post('/create-table', [
    check('tableName').notEmpty().withMessage('Table name is required'),
    check('attributes').isArray().withMessage('Attributes must be an array'),
    check('userId').notEmpty().withMessage('UserId is required'),
    check('attributes.*.name').isString().withMessage('Attribute name must be a string')
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
            // Set attribute type as VARCHAR(255) by default
            const dataType = 'VARCHAR(255)';
            query += `${mysql.escapeId(attr.name)} ${dataType}, `;

            // Determine the semanticType for metadata based on isFile flag
            const semanticType = attr.isFile === true ? 'FILE' : 'VARCHAR(255)';
            metadataInserts.push([tableName, attr.name, semanticType]);
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

                // Insert metadata for each attribute if attributes are provided
if (metadataInserts.length > 0) {
    const metadataQuery = 'INSERT INTO table_metadata (tableName, attributeName, semanticType) VALUES ?';
    pool.query(metadataQuery, [metadataInserts], (err) => {
        if (err) {
            console.error('Error inserting metadata:', err);
            return sendResponse(res, 500, 'Error inserting metadata');
        }
        sendResponse(res, 200, 'Table and metadata created successfully');
    });
} else {
    sendResponse(res, 200, 'Table created successfully without attributes');
}

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

// Endpoint to delete a row from a specific table and delete associated Google Drive files
app.delete('/delete-row/:tableName/:rowId', async (req, res) => {
    const tableName = req.params.tableName;
    const rowId = req.params.rowId;

    try {
        // Check if the table exists
        const results = await pool.query('SHOW TABLES LIKE ?', [tableName]);
        if (results.length === 0) {
            return sendResponse(res, 404, 'Table not found');
        }

        // Fetch the row with the specified ID to get the file URLs
        const rowResults = await pool.query(`SELECT * FROM ${mysql.escapeId(tableName)} WHERE id = ?`, [rowId]);
        if (rowResults.length === 0) {
            return sendResponse(res, 404, 'Row not found');
        }
        const rowData = rowResults[0];

        // Fetch metadata to determine only 'FILE' type fields dynamically
        const metadataResults = await pool.query(
            'SELECT attributeName FROM table_metadata WHERE tableName = ? AND semanticType = ?',
            [tableName, 'FILE']
        );
        const fileFields = metadataResults.map(meta => meta.attributeName);

        // Delete files from Google Drive
        for (const field of fileFields) {
            const fileUrl = rowData[field];
            if (fileUrl) {
                const fileId = extractFileIdFromUrl(fileUrl);
                if (fileId) {
                    try {
                        await drive.files.delete({ fileId });
                        console.log(`File with ID ${fileId} deleted from Google Drive`);
                    } catch (err) {
                        console.error(`Error deleting file with ID ${fileId} from Google Drive:`, err.message);
                    }
                } else {
                    console.error(`Invalid file ID extracted for URL: ${fileUrl}`);
                }
            }
        }

        // Delete the row from the database
        const deleteQuery = `DELETE FROM ${mysql.escapeId(tableName)} WHERE id = ?`;
        await pool.query(deleteQuery, [rowId]);
        sendResponse(res, 200, 'Row and associated files deleted successfully');

    } catch (error) {
        console.error('Error deleting row and files:', error);
        sendResponse(res, 500, 'Error deleting row and associated files');
    }
});

// Helper function to extract the file ID from a Google Drive URL
function extractFileIdFromUrl(fileUrl) {
    const match = fileUrl.match(/\/d\/(.+?)\/view/);
    return match ? match[1] : null;
}



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
    const rowId = req.params.rowId;
    let rowData = req.body; // Non-file data

    try {
        // Check if the table exists
        const tableExists = await pool.query('SHOW TABLES LIKE ?', [tableName]);
        if (tableExists.length === 0) {
            return sendResponse(res, 404, 'Table not found');
        }

        // Fetch the existing row to ensure it exists
        const existingRow = await pool.query(`SELECT * FROM ${mysql.escapeId(tableName)} WHERE id = ?`, [rowId]);
        if (existingRow.length === 0) {
            return sendResponse(res, 404, 'Row not found. Update cannot proceed.');
        }

        const updatedFileUrls = {};

        // Handle file uploads (if any)
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const filePath = file.path;
                const mimeType = file.mimetype;
                const folderId = '1chibBqjspiuPTEbi8lVu1PitkVgExCRY';

                try {
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

                    fs.unlinkSync(filePath);

                    const fileId = response.data.id;
                    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
                    const attributeName = file.fieldname;

                    rowData[attributeName] = fileUrl;
                    updatedFileUrls[attributeName] = fileUrl;

                } catch (error) {
                    console.error('Error uploading file:', error);
                    return res.status(500).json({ success: false, message: 'Error uploading file to Google Drive' });
                }
            }
        }

        // Remove 'id' and 'tableName' from rowData
        delete rowData['id'];
        delete rowData['tableName'];

        // Merge with existing data
        rowData = {
            ...existingRow[0],
            ...rowData,
        };

        // Construct the update query
        const columns = Object.keys(rowData);
        const values = columns.map(key => rowData[key]);
        const setClause = columns.map(column => `${mysql.escapeId(column)} = ?`).join(', ');

        // Prepare the update query
        const query = `UPDATE ${mysql.escapeId(tableName)} SET ${setClause} WHERE id = ?`;
        values.push(rowId);

        // Execute the update query
        const result = await pool.query(query, values);

        if (result.affectedRows === 0) {
            return sendResponse(res, 500, 'Update failed. No rows were modified.');
        }

        res.status(200).json({ success: true, message: 'Row updated successfully', updatedFileUrls });

    } catch (error) {
        console.error('Error in edit-row endpoint:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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
            
            // Send the row data, including any file URLs like images and songs
            sendResponse(res, 200, 'Row fetched successfully', rows[0]);
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
                        newAttributes.forEach(({ name, isFile }) => {
                            attributePromises.push(new Promise((resolve, reject) => {
                                if (!name) {
                                    return reject(new Error(`Attribute name cannot be empty. Provided: name=${name}`));
                                }

                                // Determine SQL data type and semantic type based on `isFile`
                                const sqlType = 'VARCHAR(255)';  // Using VARCHAR(255) for file or text storage
                                const semanticType = isFile ? 'FILE' : 'VARCHAR';

                                // Check if the attribute already exists
                                const checkAttributeQuery = 'SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?';
                                connection.query(checkAttributeQuery, [process.env.DB_NAME, categoryName, name], (error, results) => {
                                    if (error) return reject(error);
                                    if (results[0].count > 0) {
                                        console.log(`Attribute "${name}" already exists in category "${categoryName}". Skipping.`);
                                        return resolve();
                                    }

                                    // Add the new attribute if it doesn't exist
                                    const addQuery = `ALTER TABLE ?? ADD ?? ${sqlType}`;
                                    connection.query(addQuery, [categoryName, name], (error) => {
                                        if (error) return reject(error);

                                        // Add new attribute to table_metadata
                                        const insertMetaQuery = `INSERT INTO table_metadata (tableName, attributeName, semanticType) VALUES (?, ?, ?)`;
                                        connection.query(insertMetaQuery, [categoryName, name, semanticType], (metaError) => {
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
    dataTypeChanges.forEach(({ name, newType, isFile }) => {
        const sqlType = 'VARCHAR(255)'; // Default VARCHAR(255) for files and text
        const semanticType = isFile ? 'FILE' : 'VARCHAR'; // Set `semanticType` based on `isFile`

        const alterQuery = `ALTER TABLE ?? MODIFY ?? ${sqlType}`;
        dataTypePromises.push(new Promise((resolve, reject) => {
            connection.query(alterQuery, [categoryName, name], (error) => {
                if (error) return reject(error);

                // Update `table_metadata` with the new `semanticType`
                const updateMetaQuery = `UPDATE table_metadata SET semanticType = ? WHERE tableName = ? AND attributeName = ?`;
                connection.query(updateMetaQuery, [semanticType, categoryName, name], (metaError) => {
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
            
                        // Update `table_metadata` table with the new category name
                        const updateMetadataQuery = 'UPDATE table_metadata SET tableName = ? WHERE tableName = ?';
                        connection.query(updateMetadataQuery, [newCategoryName, categoryName], (metaError) => {
                            if (metaError) return handleError(metaError);
            
                            // Update `user_tables` table with the new category name
                            const updateUserTablesQuery = 'UPDATE user_tables SET tableName = ? WHERE tableName = ?';
                            connection.query(updateUserTablesQuery, [newCategoryName, categoryName], (userTablesError) => {
                                if (userTablesError) return handleError(userTablesError);
            
                                // Commit the transaction after all updates
                                commitTransaction();
                            });
                        });
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
