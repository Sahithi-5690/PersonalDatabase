const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // This line parses JSON request bodies

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

// Test endpoint
app.get('/', (req, res) => {
    res.json("From Backend");
});

// Endpoint to get table names
app.get('/tables', (req, res) => {
    db.query('SHOW TABLES', (error, results) => {
        if (error) {
            console.error('Error fetching table names:', error);
            return res.status(500).json({ error: 'Failed to fetch table names' });
        }
        const tables = results.map(row => Object.values(row)[0]);
        res.json(tables);
    });
});

// Endpoint to create a new table
app.post('/create-table', (req, res) => {
    const { tableName, attributes } = req.body;

    // Dynamically generate SQL query
    let query = `CREATE TABLE ${tableName} (id INT AUTO_INCREMENT PRIMARY KEY, `;
    attributes.forEach(attr => {
        query += `${mysql.escapeId(attr.name)} ${attr.type}, `;
    });
    query = query.slice(0, -2); // Remove trailing comma and space
    query += ')';

    db.query(query, (error, result) => {
        if (error) {
            console.error('Error creating table:', error);
            return res.status(500).send('Error creating table');
        }
        res.send('Table created successfully');
    });
});

// Endpoint to delete a table
app.delete('/delete-table/:tableName', (req, res) => {
    const { tableName } = req.params;

    db.query(`DROP TABLE IF EXISTS ${mysql.escapeId(tableName)}`, (error, result) => {
        if (error) {
            console.error('Error deleting table:', error);
            return res.status(500).send('Error deleting table');
        }
        res.send('Table deleted successfully');
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
            return res.status(500).json({ error: 'Error fetching table data' });
        }
        res.json(results);
    });
});

// Route for handling job application form submission
app.post('/job_applications', (req, res) => {
    const { jobTitle, jobDescription, salaryRange, company, dateApplied, status } = req.body;

    const sql = `
      INSERT INTO jobapplication (
        jobTitle, jobDescription, salaryRange,
        company, dateApplied, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [jobTitle, jobDescription, salaryRange, company, dateApplied, status];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
            return res.status(500).send('Error inserting data');
        }
        res.status(200).send('Application added successfully');
    });
});

// Endpoint to get reminders
app.get('/reminder', (req, res) => {
    const sql = "SELECT * FROM reminder";
    db.query(sql, (err, data) => {
        if (err) {
            console.error('Error fetching reminders:', err);
            return res.status(500).json({ error: 'Failed to fetch reminders' });
        }
        res.json(data);
    });
});

// Endpoint to get interview count
app.get('/reminder/interview/count', (req, res) => {
    const sql = "SELECT COUNT(*) AS totalInterviews FROM jobapplication WHERE status = 'Accepted'";
    db.query(sql, (err, data) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: err });
        }
        res.json(data[0]);
    });
});

// Endpoint to get job application count
app.get('/jobapplication/count', (req, res) => {
    const sql = "SELECT COUNT(*) AS totalApplications FROM jobapplication";
    db.query(sql, (err, data) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: err });
        }
        res.json(data[0]);
    });
});

// Endpoint to get job applications with serial number (SNO)
app.get('/jobapplication', (req, res) => {
    const sql = "SELECT *, @serial := @serial + 1 AS sno FROM JobApplication, (SELECT @serial := 0) AS init";
    db.query(sql, (err, data) => {
        if (err) {
            console.error('Error fetching job applications:', err);
            return res.status(500).json({ error: 'Failed to fetch job applications' });
        }
        res.json(data);
    });
});

// Endpoint to delete job application
app.delete('/jobapplication/:id', (req, res) => {
    const { id } = req.params;

    const deleteRemindersSql = "DELETE FROM Reminder WHERE applicationId = ?";
    db.query(deleteRemindersSql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting reminders:', err);
            return res.status(500).json({ error: err });
        }

        const deleteSql = "DELETE FROM JobApplication WHERE jobApplicationId = ?";
        db.query(deleteSql, [id], (err, result) => {
            if (err) {
                console.error('Error deleting job application:', err);
                return res.status(500).json({ error: err });
            }
            res.status(200).json({ message: 'Application and related reminders deleted successfully' });
        });
    });
});

// Endpoint to update job application
app.put('/jobapplication/:id', (req, res) => {
    const { id } = req.params;
    const { jobTitle, jobDescription, salaryRange, company, dateApplied, status } = req.body;

    const sql = `
        UPDATE JobApplication 
        SET jobTitle = ?, jobDescription = ?, salaryRange = ?, 
            company = ?, dateApplied = ?, status = ?
        WHERE jobApplicationId = ?`;

    const values = [jobTitle, jobDescription, salaryRange, company, dateApplied, status, id];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating job application:', err);
            return res.status(500).json({ error: 'Failed to update job application' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Job application not found' });
        }
        res.status(200).json({ message: 'Application updated successfully' });
    });
});

// Endpoint to save profile data
app.post('/profile', (req, res) => {
    const { firstName, surname, phoneNumber, addressLine1, addressLine2, postcode, state, area, email, education, country, region } = req.body;

    const sql = `
        INSERT INTO userprofile (firstName, lastname, phoneNumber, addressLine1, addressLine2, postcode, state, area, email, education, country, region)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [firstName, surname, phoneNumber, addressLine1, addressLine2, postcode, state, area, email, education, country, region];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error saving profile data:', err);
            return res.status(500).json({ error: 'Failed to save profile data' });
        }
        res.status(200).json({ message: 'Profile data saved successfully' });
    });
});

// Server listening on port 8081
app.listen(8081, () => {
    console.log("Listening on port 8081");
});
