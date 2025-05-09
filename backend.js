const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = 3000;

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Hemanth',
    database: 'student'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database', err);
        return;
    }
    console.log('Connected to MySQL database');
    
    // Create tables if they don't exist
    db.query(`CREATE TABLE IF NOT EXISTS admin (
        id varchar(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL
    )`, (err) => {
        if (err) throw err;
    });

    db.query(`CREATE TABLE IF NOT EXISTS parent (
        id varchar(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL
    )`, (err) => {
        if (err) throw err;
    });

    db.query(`CREATE TABLE IF NOT EXISTS student (
        id varchar(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        marks INT DEFAULT 0,
        attendance INT DEFAULT 0
    )`, (err) => {
        if (err) throw err;
    });
    db.query('create table if not exists marks(id varchar(255) PRIMARY KEY, subject1 INT DEFAULT 0,subject2 INT DEFAULT 0,subject3 INT DEFAULT 0,subject4 INT DEFAULT 0,subject5 INT DEFAULT 0,subject6 INT DEFAULT 0,subject7 INT DEFAULT 0,    totalMarks INT AS (subject1 + subject2 + subject3 + subject4 + subject5 + subject6 + subject7) STORED)')
});
db.query(`CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id varchar(255) NOT NULL,
    attendance float not null,
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
)`, (err) => {
    if (err) throw err;
});
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    console.log('Received login request:', req.body);
    const userType = req.body.user_type;
    const username = req.body.username;
    const password = req.body.password;

    let table = '';
    if (userType === 'parent') {
        table = 'parent';
    } else if (userType === 'student') {
        table = 'student';
    } else if (userType === 'admin') {
        table = 'admin';
    } else {
        return res.status(400).send('Invalid user type');
    }

    if(username=="Admin" and password=="Admin123"){
        res.redirect(`/${userType}.html`);
    }
    else{
        res.status(401).send('Invalid username or password');
    }
});

// Admin Routes
app.post('/admin/create-student', (req, res) => {
    const { id, username, password } = req.body;

    // Check if the student already exists
    db.query('SELECT * FROM student WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Error checking student existence:', err);
            return res.status(500).send('Internal server error');
        }

        if (results.length > 0) {
            // Student already exists
            return res.status(400).send('Student with this ID already exists');
        }

        // Insert new student
        db.query('INSERT INTO student (id, username, password) VALUES (?, ?, ?)', [id, username, password], (err) => {
            if (err) {
                console.error('Error inserting student:', err);
                return res.status(500).send('Internal server error');
            }
            res.send('Student created successfully');
        });
    });
});
app.post('/admin/create-parent', (req, res) => {
    const { id,username, password } = req.body;
    db.query('INSERT INTO parent (id,username, password) VALUES (?,?, ?)', [id,username, password], (err) => {
        if (err) throw err;
        res.send('Parent created successfully');
    });
});

app.post('/admin/delete-student', (req, res) => {
    const { id } = req.body;
    db.query('DELETE FROM student WHERE id = ?', [id], (err) => {
        if (err) throw err;
        res.send('Student deleted successfully');
    });
});
app.post('/admin/update-attendance', (req, res) => {
    const { id, attendance } = req.body;

    // Ensure that attendance is a percentage and between 0 and 100
    if (attendance < 0 || attendance > 100) {
        return res.status(400).send('Attendance percentage must be between 0 and 100');
    }

    // Update the overall attendance percentage for a student
    db.query('UPDATE student SET attendance = ? WHERE id = ?', [attendance, id], (err) => {
        if (err) {
            console.error('Error updating attendance:', err);
            return res.status(500).send('Internal server error');
        }
        res.send('Overall attendance updated successfully');
    });
});

app.post('/admin/delete-parent', (req, res) => {
    const { id } = req.body;
    db.query('DELETE FROM parent WHERE id = ?', [id], (err) => {
        if (err) throw err;
        res.send('Parent deleted successfully');
    });
});

app.post('/admin/update-marks', (req, res) => {
    const { id, subject, marks } = req.body;

    // Valid subjects list
    const validSubjects = {
        1: 'subject1',
        2: 'subject2',
        3: 'subject3',
        4: 'subject4',
        5: 'subject5',
        6: 'subject6',
        7: 'subject7'
    };

    // Check if the subject is valid
    if (validSubjects[subject]) {
        // Construct the SQL query for updating the subject's marks
        const query = `UPDATE marks SET ${validSubjects[subject]} = ? WHERE id = ?`;
        
        // Execute the query
        db.query(query, [marks, id], (err) => {
            if (err) {
                console.error('Error updating marks:', err);
                res.status(500).send('Error updating marks');
            } else {
                res.send('Marks updated successfully');
            }
        });
    } else {
        res.status(400).send('Invalid subject number');
    }
});
app.post('/admin/add-exam-result', (req, res) => {
    const { id, subject1, subject2, subject3, subject4, subject5, subject6, subject7 } = req.body;

    // Check if the student exists
    db.query('SELECT * FROM student WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Error checking student existence:', err);
            return res.status(500).send('Internal server error');
        }

        if (results.length > 0) {
            // Insert or update exam results
            db.query(`
                INSERT INTO marks (id, subject1, subject2, subject3, subject4, subject5, subject6, subject7)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    subject1 = VALUES(subject1),
                    subject2 = VALUES(subject2),
                    subject3 = VALUES(subject3),
                    subject4 = VALUES(subject4),
                    subject5 = VALUES(subject5),
                    subject6 = VALUES(subject6),
                    subject7 = VALUES(subject7)
            `, [id, subject1, subject2, subject3, subject4, subject5, subject6, subject7], (err) => {
                if (err) {
                    console.error('Error inserting or updating marks:', err);
                    return res.status(500).send('Internal server error');
                }
                res.send('Exam results added or updated successfully');
            });
        } else {
            res.status(404).send('Student not found');
        }
    });
});

// Fetch marks for a student

// Fetch attendance for a student
app.get('/student/attendance/:id', (req, res) => {
    const studentId = req.params.id;
    db.query('SELECT attendance FROM student WHERE id = ?', [studentId], (err, results) => {
        if (err) {
            console.error('Error fetching attendance:', err);
            res.status(500).send('Error fetching attendance');
        } else if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).send('Student not found');
        }
    });
});
app.post('/admin/update-attendance', (req, res) => {
    const { id, attendance } = req.body;
    db.query('UPDATE student SET attendance = ? WHERE id = ?', [attendance, id], (err) => {
        if (err) throw err;
        res.send('Attendance updated successfully');
    });
});
// Parent Routes
app.get('/parent/subjects-pass-percentage', (req, res) => {
    const query = `
        SELECT 
            IFNULL(
                (SELECT COUNT(*) FROM marks WHERE subject1 > 45) / NULLIF(COUNT(*), 0) * 100, 
                0
            ) AS subject1_pass_percentage,
            IFNULL(
                (SELECT COUNT(*) FROM marks WHERE subject2 > 45) / NULLIF(COUNT(*), 0) * 100, 
                0
            ) AS subject2_pass_percentage,
            IFNULL(
                (SELECT COUNT(*) FROM marks WHERE subject3 > 45) / NULLIF(COUNT(*), 0) * 100, 
                0
            ) AS subject3_pass_percentage,
            IFNULL(
                (SELECT COUNT(*) FROM marks WHERE subject4 > 45) / NULLIF(COUNT(*), 0) * 100, 
                0
            ) AS subject4_pass_percentage,
            IFNULL(
                (SELECT COUNT(*) FROM marks WHERE subject5 > 45) / NULLIF(COUNT(*), 0) * 100, 
                0
            ) AS subject5_pass_percentage,
            IFNULL(
                (SELECT COUNT(*) FROM marks WHERE subject6 > 45) / NULLIF(COUNT(*), 0) * 100, 
                0
            ) AS subject6_pass_percentage,
            IFNULL(
                (SELECT COUNT(*) FROM marks WHERE subject7 > 45) / NULLIF(COUNT(*), 0) * 100, 
                0
            ) AS subject7_pass_percentage
        FROM marks;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('SQL Error:', err);
            return res.status(500).send('Internal Server Error');
        }
        console.log('Query Results:', results);
        res.json(results[0]);
    });
});

app.get('/parent/attendance', (req, res) => {
    db.query('SELECT AVG(attendance) AS average_attendance FROM student', (err, results) => {
        if (err) throw err;
        res.json(results[0]);
    });
});

// Student Routes
app.get('/student/marks/:id', (req, res) => {
    const studentId = req.params.id;

    // Query to get marks for all subjects
    db.query('SELECT subject1, subject2, subject3, subject4, subject5, subject6, subject7 FROM marks WHERE id = ?', [studentId], (err, results) => {
        if (err) {
            console.error('Error fetching marks:', err);
            return res.status(500).send('Error fetching marks');
        }

        if (results.length > 0) {
            const marks = results[0];
            const subjects = ['subject1', 'subject2', 'subject3', 'subject4', 'subject5', 'subject6', 'subject7'];
            
            // Calculate the number of subjects with marks > 45
            const passCounts = subjects.reduce((acc, subject) => {
                acc[subject] = marks[subject] > 45 ? 1 : 0;
                return acc;
            }, {});

            // Calculate total marks and total number of subjects passed
            const totalMarks = subjects.reduce((total, subject) => total + marks[subject], 0);
            const totalPassed = Object.values(passCounts).reduce((a, b) => a + b, 0);

            res.json({
                marks,
                totalMarks,
                totalPassed
            });
        } else {
            res.status(404).send('Student not found');
        }
    });
});
app.get('/student/attendance/:id', (req, res) => {
    const studentId = req.params.id;
    db.query('SELECT attendance FROM student WHERE id = ?', [studentId], (err, results) => {
        if (err) {
            console.error('Error fetching attendance:', err);
            res.status(500).send('Error fetching attendance');
        } else if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).send('Student not found');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
