# Project 1 Website 
What works: registration, sign-in, searches by username and name, session-protected search access, and logout.

Requirements: Node.js/npm and XAMPP with a running database. Apache is needed for phpMyAdmin.

How to setup the Database: Import database/schema.sql through phpMyAdmin, which creates the database project1_wang which only needs to be imported once.

Environment setup: Create a file titled ".env" in the project1-wang directory and list out  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, PORT, and SESSION_SECRET, using placeholder ceredentials when appropriate.

To run: in your terminal in the project1-wang directory, pass the following command: "npm ci; node backend/check-db.js; node backend/app.js". Open http://127.0.0.1:5050/. To stop simply hit Ctrl+C.