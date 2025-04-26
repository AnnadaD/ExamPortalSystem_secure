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

// Dashboard - Show all available exams
router.get('/dashboard', isAuthenticated, (req, res) => {
  const sql = 'SELECT * FROM exams';
  
  db.query(sql, (err, exams) => {
    if (err) {
      console.error('Error fetching exams:', err);
      return res.status(500).send('Error loading exams');
    }
    
    // Get student's completed exams to show their scores
    const completedExamsSql = 'SELECT * FROM exam_results WHERE student_id = ?';
    
    db.query(completedExamsSql, [req.session.user.id], (err, completedExams) => {
      if (err) {
        console.error('Error fetching completed exams:', err);
        return res.status(500).send('Error loading exam history');
      }
      
      res.render('dashboard', { 
        exams: exams, 
        completedExams: completedExams
      });
    });
  });
});

// GET - Retake exam
router.get('/retake/:examId', isAuthenticated, (req, res) => {
  const examId = req.params.examId;
  const studentId = req.session.user.id;
  
  // Log retake attempt for security monitoring
  const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const user_agent = req.headers['user-agent'];
  
  try {
    // Log the retake attempt in security logs
    db.query(
      'INSERT INTO security_logs (student_id, exam_id, attempt_id, log_type, message, ip_address, user_agent) VALUES (?, ?, NULL, ?, ?, ?, ?)',
      [studentId, examId, 'EXAM_RETAKE', 'Student is retaking an exam', ip_address, user_agent]
    );
    
    // Forward to the regular start exam route but with the retake flag
    req.session.retake_exam = examId;
    res.redirect(`/exams/start/${examId}`);
  } catch (error) {
    console.error('Error initiating exam retake:', error);
    res.redirect('/exams/dashboard');
  }
});

// GET - Start an exam
router.get('/start/:examId', isAuthenticated, (req, res) => {
  const examId = req.params.examId;
  const studentId = req.session.user.id;
  const isRetake = req.session.retake_exam === examId;
  
  // Clear the retake flag from session if it exists
  if (req.session.retake_exam) {
    delete req.session.retake_exam;
  }
  
  // Function to handle database errors
  const handleError = (err, message) => {
    console.error(message, err);
    res.redirect('/exams/dashboard');
    return true; // Error occurred
  };
  
  // Sequential flow with proper error handling
  const startExam = async () => {
    try {
      // 1. Check if the student has already taken this exam
      if (!isRetake) {
        const checkSql = 'SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ?';
        const results = db.query(checkSql, [examId, studentId]);
        
        if (results && results.length > 0) {
          // Already taken - redirect to results
          res.redirect(`/exams/results/${results[0].id}`);
          return;
        }
      }
      
      // 2. Fetch exam details
      const exams = db.query('SELECT * FROM exams WHERE id = ?', [examId]);
      
      if (!exams || exams.length === 0) {
        console.error('Exam not found');
        res.redirect('/exams/dashboard');
        return;
      }
      
      const exam = exams[0];
      
      // 3. Fetch questions for this exam
      const questions = db.query('SELECT * FROM exam_questions WHERE exam_id = ?', [examId]);
      
      if (!questions) {
        console.error('Error fetching exam questions');
        res.redirect('/exams/dashboard');
        return;
      }
      
      // 4. Create a new exam attempt with security tracking
      const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const user_agent = req.headers['user-agent'];
      
      const result = db.query(
        'INSERT INTO exam_attempts (student_id, exam_id, start_time, ip_address, user_agent) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)',
        [studentId, examId, ip_address, user_agent]
      );
      
      if (!result) {
        console.error('Error creating exam attempt');
        res.redirect('/exams/dashboard');
        return;
      }
      
      const attemptId = result.lastInsertRowid;
      
      // 5. Render the exam page
      res.render('exam', {
        exam: exam,
        questions: questions,
        attemptId: attemptId
      });
      
    } catch (error) {
      console.error('Error in startExam:', error);
      res.redirect('/exams/dashboard');
    }
  };
  
  // Start the exam process
  startExam();
});

// POST - Submit an exam
router.post('/submit/:attemptId', isAuthenticated, (req, res) => {
  const attemptId = req.params.attemptId;
  const answers = req.body.answers || {};
  
  // Handle security events from client-side monitoring
  const securityEvent = req.body.security_event;
  const tabSwitchCount = req.body.tab_switch_count;
  
  if (securityEvent === 'navigation_attempt' || tabSwitchCount >= 3) {
    const studentId = req.session.user.id;
    const message = securityEvent ? 'Navigation attempt during exam' : 
                   `Tab switching detected (${tabSwitchCount} times)`;
    
    // Get exam ID from attempt
    const examId = db.query('SELECT exam_id FROM exam_attempts WHERE id = ?', [attemptId])[0]?.exam_id;
    
    // Log security event
    if (examId) {
      db.query(
        'INSERT INTO security_logs (student_id, exam_id, attempt_id, log_type, message, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          studentId, 
          examId, 
          attemptId, 
          securityEvent ? 'NAVIGATION_ATTEMPT' : 'TAB_SWITCHING', 
          message,
          req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          req.headers['user-agent']
        ]
      );
    }
  }
  
  // Sequential flow with proper error handling
  const submitExam = async () => {
    try {
      // 1. Get the attempt details
      const attempts = db.query('SELECT * FROM exam_attempts WHERE id = ?', [attemptId]);
      
      if (!attempts || attempts.length === 0) {
        console.error('Error fetching exam attempt');
        res.redirect('/exams/dashboard');
        return;
      }
      
      const attempt = attempts[0];
      const examId = attempt.exam_id;
      const studentId = req.session.user.id;
      
      // Verify this attempt belongs to the current student (security check)
      if (attempt.student_id !== studentId) {
        console.error('Security: Attempt ID does not belong to current student');
        req.session.errorMessage = "Security violation detected. This incident has been logged.";
        res.redirect('/exams/dashboard');
        return;
      }
      
      // Check if the exam is already completed
      if (attempt.completed === 1) {
        console.error('Security: Attempt to resubmit a completed exam');
        req.session.errorMessage = "This exam has already been submitted.";
        res.redirect('/exams/dashboard');
        return;
      }
      
      // 2. Get the questions and calculate the score
      const questions = db.query('SELECT * FROM exam_questions WHERE exam_id = ?', [examId]);
      
      if (!questions) {
        console.error('Error fetching exam questions');
        res.redirect('/exams/dashboard');
        return;
      }
      
      let correctAnswers = 0;
      let totalQuestions = questions.length;
      
      // 3. Calculate score
      console.log('Calculating exam score:');
      console.log('Total questions:', totalQuestions);
      
      questions.forEach(question => {
        const studentAnswer = answers[question.id];
        console.log(`Question ${question.id}: Student answered "${studentAnswer}", Correct answer is "${question.correct_option}"`);
        
        if (studentAnswer && studentAnswer.toUpperCase() === question.correct_option.toUpperCase()) {
          correctAnswers++;
          console.log(`Question ${question.id}: CORRECT`);
        } else {
          console.log(`Question ${question.id}: INCORRECT`);
        }
      });
      
      console.log('Correct answers:', correctAnswers);
      const score = Math.round((correctAnswers / totalQuestions) * 100);
      console.log('Final score:', score);
      
      // Check for time manipulation (security check)
      const currentTime = new Date();
      const startTime = new Date(attempt.start_time);
      const examDuration = db.query('SELECT duration FROM exams WHERE id = ?', [examId])[0].duration;
      const minExpectedTime = new Date(startTime.getTime() + (examDuration * 60000) * 0.3); // At least 30% of allocated time
      
      if (currentTime < minExpectedTime && score > 70) {
        console.error('Security: Possible timer manipulation detected - exam completed too quickly with high score');
        // Log the suspicious activity but still save results for review
        db.query(
          'INSERT INTO security_logs (student_id, exam_id, attempt_id, log_type, message) VALUES (?, ?, ?, ?, ?)',
          [studentId, examId, attemptId, 'TIMER_MANIPULATION', 'Completed too quickly with high score']
        );
      }
      
      // 4. Save the exam results
      const resultInsert = db.query(
        'INSERT INTO exam_results (student_id, exam_id, score, completion_time) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [studentId, examId, score]
      );
      
      if (!resultInsert) {
        console.error('Error saving exam results');
        res.redirect('/exams/dashboard');
        return;
      }
      
      // Get the result ID
      const lastIdResult = db.prepare('SELECT last_insert_rowid() as id').get();
      const resultId = lastIdResult.id;
      
      // 5. Update attempt status
      db.query(
        'UPDATE exam_attempts SET completed = 1, end_time = CURRENT_TIMESTAMP WHERE id = ?',
        [attemptId]
      );
      
      // 6. Save individual answers
      // Create an array of question IDs from the questions fetched earlier to validate input
      const validQuestionIds = questions.map(q => q.id.toString());
      
      Object.keys(answers).forEach(questionId => {
        // Only process answers for valid question IDs
        if (validQuestionIds.includes(questionId)) {
          try {
            db.query(
              'INSERT INTO student_answers (result_id, question_id, selected_option) VALUES (?, ?, ?)',
              [resultId, questionId, answers[questionId]]
            );
          } catch (err) {
            console.error(`Error saving answer for question ${questionId}:`, err);
            // Continue with other answers even if one fails
          }
        } else {
          console.log(`Skipping invalid question ID: ${questionId}`);
        }
      });
      
      // 7. Redirect to results page
      res.redirect(`/exams/results/${resultId}`);
      
    } catch (error) {
      console.error('Error in submitExam:', error);
      res.redirect('/exams/dashboard');
    }
  };
  
  // Start the submission process
  submitExam();
});

// GET - View exam results
router.get('/results/:resultId', isAuthenticated, (req, res) => {
  const resultId = req.params.resultId;
  
  // Sequential flow with proper error handling
  const viewResults = async () => {
    try {
      // 1. Get the result details
      const results = db.query(
        `SELECT r.*, e.title as exam_title, e.duration 
         FROM exam_results r 
         JOIN exams e ON r.exam_id = e.id 
         WHERE r.id = ? AND r.student_id = ?`,
        [resultId, req.session.user.id]
      );
      
      if (!results || results.length === 0) {
        console.error('Error fetching exam result');
        res.redirect('/exams/dashboard');
        return;
      }
      
      const result = results[0];
      
      // 2. Get questions and student answers
      const questionsWithAnswers = db.query(
        `SELECT q.*, a.selected_option 
         FROM exam_questions q 
         LEFT JOIN student_answers a ON q.id = a.question_id AND a.result_id = ? 
         WHERE q.exam_id = ?`,
        [resultId, result.exam_id]
      );
      
      if (!questionsWithAnswers) {
        console.error('Error fetching questions and answers');
        res.redirect('/exams/dashboard');
        return;
      }
      
      // 3. Render the results page
      res.render('results', {
        result: result,
        questions: questionsWithAnswers
      });
      
    } catch (error) {
      console.error('Error in viewResults:', error);
      res.redirect('/exams/dashboard');
    }
  };
  
  // Start the view results process
  viewResults();
});

module.exports = router;
