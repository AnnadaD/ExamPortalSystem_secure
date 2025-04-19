# Student Exam Portal

A full-stack student exam portal built with Node.js, Express, and SQLite. This project is designed to demonstrate common web application security vulnerabilities (SQL Injection and XSS) for educational purposes.

## ⚠️ Security Warning ⚠️

This application intentionally contains the following security vulnerabilities:

1. **SQL Injection**: The login route is vulnerable to SQL injection attacks.
2. **Cross-Site Scripting (XSS)**: The profile bio field does not sanitize user input.
3. **Plain Text Passwords**: Passwords are stored in plain text, not hashed.

**DO NOT USE THIS APPLICATION IN PRODUCTION OR EXPOSE IT TO THE PUBLIC INTERNET.**

## Features

- Student authentication (signup and login)
- Dashboard showing available exams
- Exam taking with countdown timer
- Auto-submission when the timer ends
- Result display showing scores and correct answers
- Profile page with editable bio

## Technical Stack

- **Backend**: Node.js with Express
- **Frontend**: EJS templates, HTML, CSS, JavaScript
- **Database**: SQLite (using better-sqlite3)
- **CSS Framework**: Bootstrap

## Getting Started

### Prerequisites

- Node.js (v14 or higher)

### Installation

1. Clone the repository or download the source code

2. Install dependencies
   ```
   npm install express ejs better-sqlite3 express-session
   ```

3. Start the application
   ```
   node index.js
   ```
   Or for development with auto-reload:
   ```
   npx nodemon index.js
   ```

4. Access the application
   Open your browser and navigate to http://localhost:5000

5. Default login credentials:
   - Username: john
   - Password: password123

## Database Schema

The application uses the following database tables:
- `students`: Stores student account information
- `exams`: Contains information about available exams
- `exam_questions`: Stores questions for each exam
- `exam_attempts`: Tracks when a student starts an exam
- `exam_results`: Stores the students' exam scores
- `student_answers`: Records the answers submitted by students

## Intentional Vulnerabilities

### SQL Injection

The login route in `routes/auth.js` concatenates user input directly into the SQL query:

```javascript
const sql = "SELECT * FROM students WHERE username = '" + username + "' AND password = '" + password + "'";
```

You can exploit this by using a payload like: `' OR '1'='1` in the username field and any value in the password field.

### Cross-Site Scripting (XSS)

The profile bio field does not sanitize user input, allowing for XSS attacks. You can try this by adding HTML or JavaScript code in your bio, such as:

```html
<script>alert('XSS Attack!');</script>
```

## Local Development

The application uses SQLite as its database, which stores all data in a file at `./data/exam_portal.db`. This file is created automatically when you first run the application.
