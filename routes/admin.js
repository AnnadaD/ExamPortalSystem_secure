const express = require('express');
const router = express.Router();
const db = require('../db');

// Admin authentication middleware
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    console.error('Unauthorized access attempt to admin area');
    req.session.errorMessage = "Access denied. Administrative privileges required.";
    res.redirect('/');
  }
};

// Admin Dashboard
router.get('/dashboard', isAdmin, (req, res) => {
  try {
    // Get counts for summary
    const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
    const examCount = db.prepare('SELECT COUNT(*) as count FROM exams').get().count;
    const attemptCount = db.prepare('SELECT COUNT(*) as count FROM exam_attempts').get().count;
    const resultCount = db.prepare('SELECT COUNT(*) as count FROM exam_results').get().count;
    
    res.render('admin/dashboard', {
      studentCount,
      examCount,
      attemptCount,
      resultCount
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).render('error', { message: 'Error loading admin dashboard' });
  }
});

// Security Logs
router.get('/security-logs', isAdmin, (req, res) => {
  try {
    // Get all security logs with related information
    const logs = db.prepare(`
      SELECT 
        sl.id, 
        sl.log_type, 
        sl.message, 
        sl.timestamp, 
        sl.ip_address, 
        sl.user_agent,
        s.username as student_username,
        e.title as exam_title
      FROM 
        security_logs sl
      LEFT JOIN 
        students s ON sl.student_id = s.id
      LEFT JOIN 
        exams e ON sl.exam_id = e.id
      ORDER BY 
        sl.timestamp DESC
      LIMIT 100
    `).all();
    
    res.render('admin/security-logs', { logs });
  } catch (error) {
    console.error('Error loading security logs:', error);
    res.status(500).render('error', { message: 'Error loading security logs' });
  }
});

// Individual Student Security Report
router.get('/student-security/:studentId', isAdmin, (req, res) => {
  try {
    const studentId = req.params.studentId;
    
    // Get student details
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    
    if (!student) {
      return res.status(404).render('error', { message: 'Student not found' });
    }
    
    // Get security logs for this student
    const logs = db.prepare(`
      SELECT 
        sl.*, 
        e.title as exam_title
      FROM 
        security_logs sl
      LEFT JOIN 
        exams e ON sl.exam_id = e.id
      WHERE 
        sl.student_id = ?
      ORDER BY 
        sl.timestamp DESC
    `).all(studentId);
    
    res.render('admin/student-security', { student, logs });
  } catch (error) {
    console.error('Error loading student security report:', error);
    res.status(500).render('error', { message: 'Error loading student security report' });
  }
});

module.exports = router;