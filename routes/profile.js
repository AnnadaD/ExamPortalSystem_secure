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

// Update profile - SECURE implementation
router.post('/update', isAuthenticated, (req, res) => {
  const { fullname, email, bio } = req.body;
  const userId = req.session.user.id;
  
  // Input validation
  if (!fullname || !email) {
    return res.status(400).send('Name and email are required');
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send('Invalid email format');
  }
  
  // SECURE: Sanitize the bio field to prevent XSS
  const sanitizeHtml = require('sanitize-html');
  const sanitizedBio = sanitizeHtml(bio, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
    allowedAttributes: {}
  });
  
  db.query(
    'UPDATE students SET fullname = ?, email = ?, bio = ? WHERE id = ?',
    [fullname, email, sanitizedBio, userId],
    (err, result) => {
      if (err) {
        console.error('Error updating profile:', err);
        return res.status(500).send('Error updating profile');
      }
      
      // Update the session user object with new information
      req.session.user.fullname = fullname;
      req.session.user.email = email;
      req.session.user.bio = sanitizedBio;
      
      res.redirect('/profile');
    }
  );
});

module.exports = router;
