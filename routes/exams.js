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
  
  // Check if the student has already taken this exam
  const checkSql = 'SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ?';
  
  db.query(checkSql, [examId, studentId], (err, results) => {
    if (err) {
      console.error('Error checking exam results:', err);
      return res.redirect('/exams/dashboard');
    }
    
    if (results.length > 0) {
      // Already taken - redirect to results
      return res.redirect(`/exams/results/${results[0].id}`);
    }
    
    // Fetch exam details
    db.query('SELECT * FROM exams WHERE id = ?', [examId], (err, exams) => {
      if (err || exams.length === 0) {
        console.error('Error fetching exam:', err);
        return res.redirect('/exams/dashboard');
      }
      
      const exam = exams[0];
      
      // Fetch questions for this exam
      db.query('SELECT * FROM exam_questions WHERE exam_id = ?', [examId], (err, questions) => {
        if (err) {
          console.error('Error fetching exam questions:', err);
          return res.redirect('/exams/dashboard');
        }
        
        // Create a new exam attempt
        db.query(
          'INSERT INTO exam_attempts (student_id, exam_id, start_time) VALUES (?, ?, NOW())',
          [studentId, examId],
          (err, result) => {
            if (err) {
              console.error('Error creating exam attempt:', err);
              return res.redirect('/exams/dashboard');
            }
            
            const attemptId = result.insertId;
            
            res.render('exam', {
              exam: exam,
              questions: questions,
              attemptId: attemptId
            });
          }
        );
      });
    });
  });
});

// POST - Submit an exam
router.post('/submit/:attemptId', isAuthenticated, (req, res) => {
  const attemptId = req.params.attemptId;
  const answers = req.body.answers || {};
  
  // Get the attempt details
  db.query('SELECT * FROM exam_attempts WHERE id = ?', [attemptId], (err, attempts) => {
    if (err || attempts.length === 0) {
      console.error('Error fetching exam attempt:', err);
      return res.redirect('/exams/dashboard');
    }
    
    const attempt = attempts[0];
    const examId = attempt.exam_id;
    const studentId = req.session.user.id;
    
    // Get the questions and calculate the score
    db.query('SELECT * FROM exam_questions WHERE exam_id = ?', [examId], (err, questions) => {
      if (err) {
        console.error('Error fetching exam questions:', err);
        return res.redirect('/exams/dashboard');
      }
      
      let correctAnswers = 0;
      let totalQuestions = questions.length;
      
      // Calculate score
      questions.forEach(question => {
        const studentAnswer = answers[question.id];
        if (studentAnswer && studentAnswer === question.correct_option) {
          correctAnswers++;
        }
      });
      
      const score = (correctAnswers / totalQuestions) * 100;
      
      // Save the answers and calculate score
      db.query(
        'INSERT INTO exam_results (student_id, exam_id, score, completion_time) VALUES (?, ?, ?, NOW())',
        [studentId, examId, score],
        (err, result) => {
          if (err) {
            console.error('Error saving exam results:', err);
            return res.redirect('/exams/dashboard');
          }
          
          const resultId = result.insertId;
          
          // Update attempt status
          db.query(
            'UPDATE exam_attempts SET completed = 1, end_time = NOW() WHERE id = ?',
            [attemptId],
            err => {
              if (err) {
                console.error('Error updating exam attempt:', err);
              }
              
              // Save individual answers
              const answerValues = [];
              const answerSql = 'INSERT INTO student_answers (result_id, question_id, selected_option) VALUES ?';
              
              Object.keys(answers).forEach(questionId => {
                answerValues.push([resultId, questionId, answers[questionId]]);
              });
              
              if (answerValues.length > 0) {
                db.query(answerSql, [answerValues], err => {
                  if (err) {
                    console.error('Error saving student answers:', err);
                  }
                  
                  res.redirect(`/exams/results/${resultId}`);
                });
              } else {
                res.redirect(`/exams/results/${resultId}`);
              }
            }
          );
        }
      );
    });
  });
});

// GET - View exam results
router.get('/results/:resultId', isAuthenticated, (req, res) => {
  const resultId = req.params.resultId;
  
  // Get the result details
  db.query(
    `SELECT r.*, e.title as exam_title, e.duration 
     FROM exam_results r 
     JOIN exams e ON r.exam_id = e.id 
     WHERE r.id = ? AND r.student_id = ?`,
    [resultId, req.session.user.id],
    (err, results) => {
      if (err || results.length === 0) {
        console.error('Error fetching exam result:', err);
        return res.redirect('/exams/dashboard');
      }
      
      const result = results[0];
      
      // Get questions and student answers
      db.query(
        `SELECT q.*, a.selected_option 
         FROM exam_questions q 
         LEFT JOIN student_answers a ON q.id = a.question_id AND a.result_id = ? 
         WHERE q.exam_id = ?`,
        [resultId, result.exam_id],
        (err, questionsWithAnswers) => {
          if (err) {
            console.error('Error fetching questions and answers:', err);
            return res.redirect('/exams/dashboard');
          }
          
          res.render('results', {
            result: result,
            questions: questionsWithAnswers
          });
        }
      );
    }
  );
});

module.exports = router;
