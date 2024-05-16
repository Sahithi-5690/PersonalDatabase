const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
app.use(cors());

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

app.get('/', (req, res) => {
    return res.json("From Backend");
});

app.get('/jobapplication', (req, res) => {
    const sql = "SELECT * FROM jobapplication";
    db.query(sql, (err, data) => {
        if (err) return res.json(err);
        return res.json(data);
    });
});

//Endpoint to get the count of interviews
app.get('/reminder', (req, res) => {
    const sql = "SELECT * FROM reminder";
    db.query(sql, (err, data) => {
        if (err) return res.json(err);

        // Convert data to HTML table
        let html = '<table border="1">';
        html += '<thead><tr><th>Reminder ID</th><th>Application ID</th><th>Reminder Date</th><th>Reminder Type</th><th>Reminder Notes</th></tr></thead>';
        html += '<tbody>';

        data.forEach(row => {
            html += '<tr>';
            html += '<td>' + row.reminderId + '</td>';
            html += '<td>' + row.applicationId + '</td>';
            html += '<td>' + row.reminderDate + '</td>';
            html += '<td>' + row.reminderType + '</td>';
            html += '<td>' + row.reminderNotes + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        
        res.send(html);
    });
});

// Endpoint to get the count of interviews scheduled
app.get('/reminder/interview/count', (req, res) => {
    const sql = "SELECT COUNT(*) AS totalInterviews FROM reminder WHERE reminderType = 'Thank You'";
    db.query(sql, (err, data) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: err });
        }
        return res.json(data[0]);
    });
});

// Endpoint to get the count of job applications
app.get('/jobapplication/count', (req, res) => {
    const sql = "SELECT COUNT(*) AS totalApplications FROM jobapplication";
    db.query(sql, (err, data) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: err });
        }
        return res.json(data[0]);
    });
});

app.listen(8081, () => {
    console.log("Listening on port 8081");
});
