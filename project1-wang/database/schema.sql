CREATE DATABASE IF NOT EXISTS project1_wang
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE project1_wang;

CREATE TABLE users (
    username VARCHAR(50) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    salary DECIMAL(12, 2) NOT NULL,
    age INT NOT NULL,
    registerday DATE NOT NULL,
    signintime DATETIME DEFAULT NULL,
    CONSTRAINT chk_salary CHECK (salary >= 0),
    CONSTRAINT chk_age CHECK (age BETWEEN 0 AND 150)
);