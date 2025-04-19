const express = require('express');
const router = express.Router();
const db = require('../db');

// GET login page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST login - INTENTIONALLY VULNERABLE TO SQL INJECTION
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // VULNERABLE: Direct string concatenation in SQL query (SQL Injection vulnerability)
  const sql = "SELECT * FROM students WHERE username = '" + username + "' AND password = '" + password + "'";
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error executing login query:', err);
      return res.render('login', { error: 'Database error occurred' });
    }
    
    if (results.length > 0) {
      // Set user session
      req.session.user = results[0];
      return res.redirect('/exams/dashboard');
    } else {
      return res.render('login', { error: 'Invalid username or password' });
    }
  });
});

// GET signup page
router.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// POST signup
router.post('/signup', (req, res) => {
  const { fullname, username, email, password } = req.body;
  
  // Check if username already exists
  db.query('SELECT * FROM students WHERE username = ?', [username], (err, results) => {
    if (err) {
      console.error('Error checking username:', err);
      return res.render('signup', { error: 'Database error occurred' });
    }
    
    if (results.length > 0) {
      return res.render('signup', { error: 'Username already exists' });
    }
    
    // Insert new student (VULNERABLE: Storing passwords in plain text)
    const insertSql = 'INSERT INTO students (fullname, username, email, password, bio) VALUES (?, ?, ?, ?, ?)';
    db.query(insertSql, [fullname, username, email, password, ''], (err, result) => {
      if (err) {
        console.error('Error creating user:', err);
        return res.render('signup', { error: 'Error creating account' });
      }
      
      // Log the user in
      db.query('SELECT * FROM students WHERE id = ?', [result.insertId], (err, userData) => {
        if (err || userData.length === 0) {
          return res.redirect('/login');
        }
        
        req.session.user = userData[0];
        res.redirect('/exams/dashboard');
      });
    });
  });
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
