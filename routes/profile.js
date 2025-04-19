const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Get profile page
router.get('/', isAuthenticated, (req, res) => {
  // Fetch latest user data
  db.query('SELECT * FROM students WHERE id = ?', [req.session.user.id], (err, results) => {
    if (err || results.length === 0) {
      console.error('Error fetching user profile:', err);
      return res.redirect('/exams/dashboard');
    }
    
    // Update the session user object
    req.session.user = results[0];
    
    res.render('profile', { user: req.session.user });
  });
});

// Update profile - INTENTIONALLY VULNERABLE TO XSS
router.post('/update', isAuthenticated, (req, res) => {
  const { fullname, email, bio } = req.body;
  const userId = req.session.user.id;
  
  // VULNERABLE: No sanitization of 'bio' field, allowing XSS attacks
  db.query(
    'UPDATE students SET fullname = ?, email = ?, bio = ? WHERE id = ?',
    [fullname, email, bio, userId],
    (err, result) => {
      if (err) {
        console.error('Error updating profile:', err);
        return res.status(500).send('Error updating profile');
      }
      
      // Update the session user object with new information
      req.session.user.fullname = fullname;
      req.session.user.email = email;
      req.session.user.bio = bio;
      
      res.redirect('/profile');
    }
  );
});

module.exports = router;
