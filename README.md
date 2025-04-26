# Student Exam Portal

A full-stack student exam portal built with Node.js, Express, and SQLite. This project features a comprehensive security implementation to protect against common web vulnerabilities.

## 🛡️ Security Features 🛡️

This application implements the following security measures:

1. **SQL Injection Protection**: All database queries use parameterized statements.
2. **Cross-Site Scripting (XSS) Protection**: User input is sanitized using the sanitize-html library.
3. **Password Security**: Passwords are hashed using bcrypt.
4. **CSRF Protection**: All forms include CSRF tokens for protection against cross-site request forgery.
5. **HTTP Security Headers**: Implemented using Helmet middleware.
6. **Secure Session Management**: Sessions are configured with secure options.

The application is designed with security best practices for educational purposes.

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

1. Clone the repository
   ```
   git clone <repository-url>
   cd student-exam-portal
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Initialize the database (important after cloning)
   ```
   node setup.js
   ```
   This creates the necessary data directory and database with sample data.

4. Start the application
   ```
   node index.js
   ```
   Or for development with auto-reload:
   ```
   npx nodemon index.js
   ```

5. Access the application
   Open your browser and navigate to http://localhost:5000
   
   Note: If you get a "HTTP ERROR 403" or "Access denied" error:
   - Make sure the data directory and database file have proper permissions
   - Try accessing with http://127.0.0.1:5000 instead of localhost
   - Check if port 5000 is already in use by another application

6. Default login credentials:
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

## Security Implementation

### SQL Injection Protection

The application uses parameterized queries for all database operations:

```javascript
// Example from auth.js
const sql = "SELECT * FROM students WHERE username = ?";
db.query(sql, [username], (err, results) => {
  // Secure handling of results
});
```

### Cross-Site Scripting (XSS) Protection

User input is sanitized before storage and display:

```javascript
// Example from profile.js
const sanitizeHtml = require('sanitize-html');
const sanitizedBio = sanitizeHtml(bio, {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
  allowedAttributes: {}
});
```

### CSRF Protection

All forms include CSRF tokens to prevent cross-site request forgery:

```html
<form action="/login" method="POST">
  <!-- CSRF Protection -->
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <!-- Form fields -->
</form>
```

### Password Security

Passwords are securely hashed using bcrypt:

```javascript
const bcrypt = require('bcryptjs');
const hashedPassword = bcrypt.hashSync(password, 10);
```

## Local Development

The application uses SQLite as its database, which stores all data in a file at `./data/exam_portal.db`. This file is created automatically when you first run the application.

## Security Features Overview

### Implemented Protections

1. **CSRF Protection**
   - All forms are protected against Cross-Site Request Forgery attacks using CSRF tokens
   - Implemented using the `csurf` middleware
   - Failed CSRF validation results in a 403 Forbidden response

2. **Password Security**
   - All passwords are hashed using bcrypt with appropriate salt rounds
   - Plain text passwords are never stored in the database
   - Migration script (`migrate-passwords.js`) to securely hash existing plain text passwords

3. **Input Sanitization**
   - User inputs are sanitized to prevent XSS attacks using `sanitize-html`
   - HTML tags and attributes are filtered to allow only safe content

4. **Security Headers**
   - Comprehensive set of HTTP security headers using Helmet middleware
   - Content Security Policy (CSP) to prevent XSS and data injection
   - X-Content-Type-Options to prevent MIME type sniffing
   - Strict-Transport-Security to enforce HTTPS
   - X-Frame-Options to prevent clickjacking

5. **Parameterized Queries**
   - All database queries use parameterized statements
   - Protection against SQL injection attacks

## Testing Security Features

You can verify the security features implemented in this application:

1. **CSRF Protection**: View the page source on any form to see the CSRF token:
   ```html
   <input type="hidden" name="_csrf" value="...">
   ```

2. **Password Hashing**: Inspect the database using the SQLite CLI:
   ```
   sqlite3 ./data/exam_portal.db
   sqlite> SELECT username, password FROM students;
   ```
   Note how passwords are stored as bcrypt hashes starting with `$2a$` or `$2b$`.

3. **HTTP Security Headers**: Use curl to check the response headers:
   ```
   curl -I http://localhost:5000/login
   ```
   Verify headers like Content-Security-Policy, X-XSS-Protection, etc.

4. **XSS Protection**: Try entering HTML or JavaScript in the profile bio field.
   The application will sanitize these inputs, removing potentially dangerous tags and attributes.
