const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const db = require('./db');

// Import routes
const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exams');
const profileRoutes = require('./routes/profile');

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware
app.use(session({
  secret: 'exam-portal-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 hour
}));

// Custom middleware to make user data available to all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/exams', examRoutes);
app.use('/profile', profileRoutes);

// Home route redirects to login if not logged in, or dashboard if logged in
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/exams/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle process termination to close database connection
process.on('SIGINT', () => {
  db.end();
  process.exit();
});
