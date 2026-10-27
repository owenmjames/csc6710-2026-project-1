const express = require('express');
const path = require('path');
const pool = require('./db');
const bcrypt = require('bcryptjs');
const session = require('express-session')

const app = express();
const port = Number(process.env.PORT) || 5050;


app.use(express.json());

app.use(session({secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, cookie: {httpOnly: true, secure: false}}));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/search', (req, res) => {
    if (!req.session.username) { return res.redirect('/') }
    return res.sendFile(path.join(__dirname, '..', "private/search.html"))
});

app.get('/api/health', (req, res) => {
    res.json({ message: 'Backend is running!' });
});


app.post('/api/register', async (req, res) => {
    const {
        username,
        password,
        firstname,
        lastname,
        salary,
        age
    } = req.body || {};

    
    const textFields = [username, password, firstname, lastname];

    if (textFields.some(value =>
        typeof value !== 'string' || value.trim() === ''
    )) {
        return res.status(400).json({
            message: 'Please complete all text fields.'
        });
    }

   
    if (
        username.trim().length > 50 ||
        firstname.trim().length > 50 ||
        lastname.trim().length > 50
    ) {
        return res.status(400).json({
            message: 'Username and names must not exceed 50 characters.'
        });
    }

    
    const salaryNumber = Number(salary);
    const ageNumber = Number(age);

    if (
        salary === undefined ||
        salary === null ||
        String(salary).trim() === '' ||
        !Number.isFinite(salaryNumber) ||
        salaryNumber < 0 ||
        salaryNumber > 9999999999.99 ||
        age === undefined ||
        age === null ||
        String(age).trim() === '' ||
        !Number.isInteger(ageNumber) ||
        ageNumber < 0 ||
        ageNumber > 150
    ) {
        return res.status(400).json({
            message: 'Please enter a valid salary and age.'
        });
    }

    try {
       
        const passwordHash = await bcrypt.hash(password, 10);

        await pool.execute(
            `INSERT INTO users
                (username, password, firstname, lastname,
                 salary, age, registerday, signintime)
             VALUES (?, ?, ?, ?, ?, ?, CURDATE(), NULL)`,
            [
                username.trim(),
                passwordHash,
                firstname.trim(),
                lastname.trim(),
                salaryNumber,
                ageNumber
            ]
        );

        return res.status(201).json({
            message: 'Registration successful!'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'This username is already taken.'
            });
        }

        console.error('Registration failed:', error.message);

        return res.status(500).json({
            message: 'Registration failed. Please try again.'
        });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};

   
    if (
        typeof username !== 'string' ||
        typeof password !== 'string' ||
        username.trim() === '' ||
        password.trim() === ''
    ) {
        return res.status(400).json({
            message: 'Please enter your username and password.'
        });
    }

    try {
        
        const [rows] = await pool.execute(
            'SELECT username, password FROM users WHERE username = ?',
            [username.trim()]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: 'Invalid username or password.'
            });
        }

        const user = rows[0];

     
        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Invalid username or password.'
            });
        }

        await pool.execute(
            'UPDATE users SET signintime = NOW() WHERE username = ?',
            [user.username]
        );

        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({
                    message: 'Unable to start session.'
                });
            }
            req.session.username = user.username;
            req.session.save((error) => {
                if (error) {
                    return res.status(500).json({
                        message: 'Unable to start session.'
                    })
                } return res.json({
                    message: 'Sign in successful!',
                    username: user.username
                });
            });
        });


    } catch (error) {
        console.error('Sign in failed:', error.message);

        return res.status(500).json({
            message: 'Sign in failed. Please try again.'
        });
    }
});

// logout route
app.post('/api/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) { return res.status(500).json({ message: 'Unable to log out' }) }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' })
    })
}

);

// search by users
app.get('/api/users/by-username', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({
            message: 'Please sign in to search.'
        });
    }

    const username = req.query.username;

    if (
        typeof username !== 'string' ||
        username.trim() === '' ||
        username.trim().length > 50
    ) {
        return res.status(400).json({
            message: 'Please enter a username of up to 50 characters.'
        });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT username, firstname, lastname,
                    salary, age, registerday, signintime
             FROM users
             WHERE username = ?`,
            [username.trim()]
        );

        return res.json({
            message: rows.length > 0
                ? 'User found.'
                : 'No matching user found.',
            users: rows
        });
    } catch (error) {
        console.error('User search failed:', error.message);

        return res.status(500).json({
            message: 'User search failed. Please try again.'
        });
    }
});
// search by first or last or whole name
app.get('/api/users/by-name', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({
            message: 'Please sign in to search.'
        });
    }
    const firstname = req.query.firstname ?? '';
    const lastname = req.query.lastname ?? '';

    // check parameter types and lengths
    if (
        typeof firstname !== 'string' ||
        typeof lastname !== 'string' ||
        firstname.trim().length > 50 ||
        lastname.trim().length > 50
    ) {
        return res.status(400).json({
            message: 'Names must not exceed 50 characters.'
        });
    }

    const first = firstname.trim();
    const last = lastname.trim();

    // at least fill one 
    if (first === '' && last === '') {
        return res.status(400).json({
            message: 'Please enter a first name or last name.'
        });
    }

    try {
        const conditions = [];
        const values = [];

        if (first !== '') {
            conditions.push('firstname = ?');
            values.push(first);
        }

        if (last !== '') {
            conditions.push('lastname = ?');
            values.push(last);
        }

        const sql = `
            SELECT username, firstname, lastname,
                   salary, age, registerday, signintime
            FROM users
            WHERE ${conditions.join(' AND ')}
            ORDER BY username
        `;

        const [rows] = await pool.execute(sql, values);

        return res.json({
            message: rows.length > 0
                ? 'Matching users found.'
                : 'No matching user found.',
            users: rows
        });
    } catch (error) {
        console.error('Name search failed:', error.message);

        return res.status(500).json({
            message: 'Name search failed. Please try again.'
        });
    }
});
   // Search users by salary range.
app.get('/api/users/by-salary', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({
            message: 'Please sign in first.'
        });
    }

    const { min, max } = req.query;

    if (
        typeof min !== 'string' ||
        typeof max !== 'string' ||
        min.trim() === '' ||
        max.trim() === ''
    ) {
        return res.status(400).json({
            message: 'Please enter both minimum and maximum salary.'
        });
    }

    const minSalary = Number(min);
    const maxSalary = Number(max);

    if (
        !Number.isFinite(minSalary) ||
        !Number.isFinite(maxSalary) ||
        minSalary < 0 ||
        maxSalary < 0 ||
        minSalary > 9999999999.99 ||
        maxSalary > 9999999999.99
    ) {
        return res.status(400).json({
            message: 'Enter salaries between 0 and 9999999999.99.'
        });
    }

    if (minSalary > maxSalary) {
        return res.status(400).json({
            message: 'Minimum salary cannot exceed maximum salary.'
        });
    }

    try {
        const [users] = await pool.execute(
            `SELECT username, firstname, lastname, salary,
                    age, registerday, signintime
             FROM users
             WHERE salary BETWEEN ? AND ?
             ORDER BY salary, username`,
            [minSalary, maxSalary]
        );

        return res.json({
            message: users.length > 0
                ? 'Matching users found.'
                : 'No matching users found.',
            users
        });
    } catch (error) {
        console.error('Salary search failed:', error);

        return res.status(500).json({
            message: 'Salary search failed. Please try again.'
        });
    }
});
// Search users by age range.
app.get('/api/users/by-age', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({
            message: 'Please sign in first.'
        });
    }

    const { min, max } = req.query;

    if (
        typeof min !== 'string' ||
        typeof max !== 'string' ||
        min.trim() === '' ||
        max.trim() === ''
    ) {
        return res.status(400).json({
            message: 'Please enter both minimum and maximum age.'
        });
    }

    const minAge = Number(min);
    const maxAge = Number(max);

    if (
        !Number.isInteger(minAge) ||
        !Number.isInteger(maxAge) ||
        minAge < 0 ||
        maxAge > 150 ||
        minAge > maxAge
    ) {
        return res.status(400).json({
            message: 'Enter whole ages from 0 to 150. Minimum cannot exceed maximum.'
        });
    }

    try {
        const [users] = await pool.execute(
            `SELECT username, firstname, lastname, salary,
                    age, registerday, signintime
             FROM users
             WHERE age BETWEEN ? AND ?
             ORDER BY age, username`,
            [minAge, maxAge]
        );

        return res.json({
            message: users.length > 0
                ? 'Matching users found.'
                : 'No matching users found.',
            users
        });
    } catch (error) {
        console.error('Age search failed:', error);

        return res.status(500).json({
            message: 'Age search failed. Please try again.'
        });
    }});
//Search users registered after given username
app.get('/api/users/registered-after', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({
            message: 'Please sign in first.'
        });
    }

    const username = req.query.username;

    if (
        typeof username !== 'string' ||
        username.trim() === '' ||
        username.trim().length > 50
    ) {
        return res.status(400).json({
            message: 'Please enter a username of up to 50 characters.'
        });
    }

    try {
        const [referenceRows] = await pool.execute(
            'SELECT registerday FROM users WHERE username = ?',
            [username.trim()]
        );

        if (referenceRows.length === 0) { return res.status(404).json({ message: "Reference username not found." }); }

        const [rows] = await pool.execute(
            `SELECT username, firstname, lastname, salary, age, registerday, signintime
            FROM users
            WHERE registerday > (SELECT registerday
	            FROM users
	            WHERE username = ?)
            ORDER by registerday, username;`,
            [username.trim()]
        );

        return res.json({
            message: rows.length > 0
                ? 'User found.'
                : 'No users registered after this user.',
            users: rows
        });
    } catch (error) {
        console.error('User search failed:', error.message);

        return res.status(500).json({
            message: 'User search failed. Please try again.'
        });
    }
}
);
// Search users who have never signed in.
app.get('/api/users/never-signed-in', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({
            message: 'Please sign in first.'
        });
    }

    try {
        const [users] = await pool.execute(
            `SELECT username, firstname, lastname,
                    salary, age, registerday, signintime
             FROM users
             WHERE signintime IS NULL
             ORDER BY username`
        );

        return res.json({
            message: users.length > 0
                ? 'Users who have never signed in found.'
                : 'No users who have never signed in found.',
            users
        });
    } catch (error) {
        console.error('Never-signed-in search failed:', error.message);

        return res.status(500).json({
            message: 'Search failed. Please try again.'
        });
    }
});
async function startServer() {
    try {
        await pool.execute('SELECT 1');

        app.listen(port, '127.0.0.1', () => {
            console.log(`Server running at http://127.0.0.1:${port}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error.message);
        await pool.end();
        process.exitCode = 1;
    }
}

startServer();