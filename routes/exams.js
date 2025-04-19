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

// GET - Start an exam
router.get('/start/:examId', isAuthenticated, (req, res) => {
  const examId = req.params.examId;
  const studentId = req.session.user.id;
  
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
      const checkSql = 'SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ?';
      const results = db.query(checkSql, [examId, studentId]);
      
      if (results && results.length > 0) {
        // Already taken - redirect to results
        res.redirect(`/exams/results/${results[0].id}`);
        return;
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
      
      // 4. Create a new exam attempt
      const result = db.query(
        'INSERT INTO exam_attempts (student_id, exam_id, start_time) VALUES (?, ?, datetime("now"))',
        [studentId, examId]
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
      questions.forEach(question => {
        const studentAnswer = answers[question.id];
        if (studentAnswer && studentAnswer === question.correct_option) {
          correctAnswers++;
        }
      });
      
      const score = (correctAnswers / totalQuestions) * 100;
      
      // 4. Save the exam results
      const resultInsert = db.query(
        'INSERT INTO exam_results (student_id, exam_id, score, completion_time) VALUES (?, ?, ?, datetime("now"))',
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
        'UPDATE exam_attempts SET completed = 1, end_time = datetime("now") WHERE id = ?',
        [attemptId]
      );
      
      // 6. Save individual answers
      Object.keys(answers).forEach(questionId => {
        db.query(
          'INSERT INTO student_answers (result_id, question_id, selected_option) VALUES (?, ?, ?)',
          [resultId, questionId, answers[questionId]]
        );
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
