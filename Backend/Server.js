const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Add this line to parse JSON request bodies

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

app.get('/jobapplication', (req, res) => {
    const sql = "SELECT * FROM JobApplication";
    db.query(sql, (err, data) => {
        if (err) return res.json(err);

        // Convert data to HTML table with edit and delete buttons
        let html = '<table>';
        html += '<thead><tr><th>Job Application ID</th><th>Job Title</th><th>Job Description</th><th>Contact Info</th><th>Salary Range</th><th>Experience</th><th>Company</th><th>Date Applied</th><th>Job Type</th><th>Resume</th><th>Cover Letter</th><th>Status</th><th>Interview Date</th><th>Interviewer</th><th>Feedback</th><th>Offer Status</th><th>Acceptance Status</th><th>Start Date</th><th>Actions</th></tr></thead>';
        html += '<tbody>';

        data.forEach(row => {
            html += '<tr>';
            html += '<td>' + row.jobApplicationId + '</td>';
            html += '<td>' + row.jobTitle + '</td>';
            html += '<td>' + row.jobDescription + '</td>';
            html += '<td>' + row.contactInfo + '</td>';
            html += '<td>' + row.salaryRange + '</td>';
            html += '<td>' + row.experience + '</td>';
            html += '<td>' + row.company + '</td>';
            html += '<td>' + row.dateApplied + '</td>';
            html += '<td>' + row.jobType + '</td>';
            html += '<td>' + row.resume + '</td>';
            html += '<td>' + row.coverLetter + '</td>';
            html += '<td>' + row.status + '</td>';
            html += '<td>' + (row.interviewDate || '') + '</td>';
            html += '<td>' + (row.interviewer || '') + '</td>';
            html += '<td>' + (row.feedback || '') + '</td>';
            html += '<td>' + (row.offerStatus || '') + '</td>';
            html += '<td>' + (row.acceptanceStatus || '') + '</td>';
            html += '<td>' + (row.startDate || '') + '</td>';
            html += '<td class="btn-container">';
            html += '<button class="btn btn-primary" onclick="editApplication(' + row.jobApplicationId + ')">Edit</button>';
            html += '<button class="btn btn-danger" onclick="deleteApplication(' + row.jobApplicationId + ')">Delete</button>';
            html += '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        
        res.send(html);
    });
});


// Endpoint to delete a job application
app.delete('/jobapplication/:id', (req, res) => {
    const { id } = req.params;

    // First, delete related reminders
    const deleteRemindersSql = "DELETE FROM Reminder WHERE applicationId = ?";
    db.query(deleteRemindersSql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting reminders:', err);
            return res.status(500).json({ error: err });
        }

        // Next, delete the job application
        const deleteSql = "DELETE FROM JobApplication WHERE jobApplicationId = ?";
        db.query(deleteSql, [id], (err, result) => {
            if (err) {
                console.error('Error deleting job application:', err);
                return res.status(500).json({ error: err });
            }
            return res.status(200).json({ message: 'Application and related reminders deleted successfully' });
        });
    });
});

// Endpoint to get a specific job application by ID
app.get('/jobapplication/:id', (req, res) => {
    const { id } = req.params;
    const sql = "SELECT * FROM JobApplication WHERE jobApplicationId = ?";
    db.query(sql, [id], (err, data) => {
        if (err) {
            console.error('Error fetching job application:', err);
            return res.status(500).json({ error: err });
        }
        if (data.length === 0) {
            return res.status(404).json({ message: 'Job application not found' });
        }
        return res.json(data[0]);
    });
});

// PUT endpoint to update a job application
app.put('/jobapplication/:id', (req, res) => {
    const { id } = req.params;
    const applicationData = req.body;

    // Validate input data
    // Example validation: Check if required fields are present
    if (!applicationData.jobTitle || !applicationData.contactInfo) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = `
        UPDATE JobApplication 
        SET 
            jobTitle = ?, 
            jobDescription = ?, 
            contactInfo = ?, 
            salaryRange = ?, 
            experience = ?, 
            company = ?, 
            dateApplied = ?, 
            jobType = ?, 
            resume = ?, 
            coverLetter = ?, 
            status = ?, 
            interviewDate = ?, 
            interviewer = ?, 
            feedback = ?, 
            offerStatus = ?, 
            acceptanceStatus = ?, 
            startDate = ? 
        WHERE jobApplicationId = ?`;

    const values = [
        applicationData.jobTitle, 
        applicationData.jobDescription, 
        applicationData.contactInfo, 
        applicationData.salaryRange, 
        applicationData.experience, 
        applicationData.company, 
        applicationData.dateApplied, 
        applicationData.jobType, 
        applicationData.resume, 
        applicationData.coverLetter, 
        applicationData.status, 
        applicationData.interviewDate, 
        applicationData.interviewer, 
        applicationData.feedback, 
        applicationData.offerStatus, 
        applicationData.acceptanceStatus, 
        applicationData.startDate, 
        id
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating job application:', err);
            return res.status(500).json({ error: 'Failed to update job application' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Job application not found' });
        }
        return res.status(200).json({ message: 'Application updated successfully' });
    });
});




app.listen(8081, () => {
    console.log("Listening on port 8081");
});
