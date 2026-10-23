const pool = require('./db');

async function checkDatabase() {
    try {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) AS total FROM users'
        );

        console.log('Database connection successful!');
        console.log('Number of users:', rows[0].total);
    } catch (error) {
        console.error('Database check failed:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

checkDatabase();