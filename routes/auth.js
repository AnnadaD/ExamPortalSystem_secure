const express = require('express');
const router = express.Router();
const db = require('../db');

// GET login page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST login - SECURE implementation
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // SECURE: Using parameterized queries to prevent SQL injection
  const sql = "SELECT * FROM students WHERE username = ?";
  
  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error('Error executing login query:', err);
      return res.render('login', { error: 'Database error occurred' });
    }
    
    if (results.length > 0) {
      const user = results[0];
      
      // Compare the provided password with the stored hash
      const bcrypt = require('bcryptjs');
      
      // All passwords are now bcrypt hashed
      if (bcrypt.compareSync(password, user.password)) {
        req.session.user = user;
        return res.redirect('/exams/dashboard');
      } else {
        return res.render('login', { error: 'Invalid username or password' });
      }
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
    
    // SECURE: Hash password before storing
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const insertSql = 'INSERT INTO students (fullname, username, email, password, bio) VALUES (?, ?, ?, ?, ?)';
    db.query(insertSql, [fullname, username, email, hashedPassword, ''], (err, result) => {
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

// Logout route1
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
