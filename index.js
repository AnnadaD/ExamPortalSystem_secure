const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const app = express();
const db = require('./db');

// Use Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdn.replit.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' }
}));

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

// Set up cookie-parser - required for CSRF with cookie option
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Session middleware with improved security
app.use(session({
  secret: process.env.SESSION_SECRET || 'exam-portal-secret-key',
  resave: false,
  saveUninitialized: false, // Don't create session until something stored
  cookie: { 
    maxAge: 3600000, // 1 hour
    httpOnly: true, // Cannot be accessed by JavaScript
    secure: process.env.NODE_ENV === 'production', // Only use HTTPS in production
    sameSite: 'strict' // Protection against CSRF
  }
}));

// CSRF Protection
const csrf = require('csurf');
// Initialize CSRF protection after session and cookie-parser
const csrfProtection = csrf({ cookie: { sameSite: 'strict' } });

// Global middleware for CSRF
app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

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
  // Handle CSRF token errors
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('CSRF attack detected:', err);
    return res.status(403).render('error', { 
      message: 'Form submission failed. Try refreshing the page and submitting again.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
  
  // Handle other errors
  console.error(err.stack);
  res.status(err.status || 500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
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
