# csc6710-2026-project-1
## Team Members
- Owen
- Huanhuan Wang

## Project Description
A user management application with registration, login, and search features, including:
- username search
- first and/or last name search
- search by salary range
- search by age
- search for users registered after a given user
- search for users that have never signed in
- search for users that have registered on the same day as a reference user
- search for users that have registered today

# How to run the application:

Requirements: Node.js/npm and XAMPP with a running database. Apache is needed for phpMyAdmin.

How to compile: No compilation is required. Node.js runs the JavaScript directly.

How to deploy: Node.js serves the website and XAMPP supplies the database. The project does not need to be moved into XAMPP's htdocs directory.

How to setup the Database: Import the contents of database/schema.sql through phpMyAdmin, which creates the database project1_wang which only needs to be imported once.

Environment setup: Rename the file "dotenv" to ".env" in the project1-wang directory.

To run: Make sure your terminal is in the project1-wang directory. Then, run the following three commands:

```text
npm ci
node backend/check-db.js
node backend/app.js
```

Open http://127.0.0.1:5050/.

To stop: simply hit Ctrl+C in the terminal the web server is running in.
