const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Ensure the database directory exists
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

// Create a connection to the SQLite database
const db = new Database(path.join(dbDir, 'exam_portal.db'));

// Helper function to run SQL queries (API similar to mysql)
db.query = function(sql, params, callback) {
  try {
    // For INSERT, UPDATE, DELETE
    if (sql.trim().toLowerCase().startsWith('insert') || 
        sql.trim().toLowerCase().startsWith('update') ||
        sql.trim().toLowerCase().startsWith('delete')) {
      
      // Handle parameterized queries
      let stmt;
      if (Array.isArray(params) && params.length > 0) {
        stmt = this.prepare(sql);
        const result = stmt.run(...params);
        if (callback) callback(null, result);
        return result;
      } else if (Array.isArray(params) && params[0] && Array.isArray(params[0])) {
        // For batch inserts like INSERT INTO x VALUES ?
        stmt = this.prepare(sql.replace('?', function(match, offset, string) {
          const placeholders = [];
          for (let i = 0; i < params[0][0].length; i++) {
            placeholders.push('?');
          }
          return `(${placeholders.join(', ')})`;
        }));
        
        const insertMany = this.transaction((rows) => {
          for (const row of rows) {
            stmt.run(...row.flat());
          }
        });
        
        insertMany(params);
        if (callback) callback(null, { insertId: this.prepare('SELECT last_insert_rowid() as id').get().id });
        return;
      } else if (typeof params === 'function') {
        // No params, only callback
        callback = params;
        stmt = this.prepare(sql);
        const result = stmt.run();
        if (callback) callback(null, result);
        return result;
      } else if (!params) {
        // No params, no callback
        stmt = this.prepare(sql);
        return stmt.run();
      }
    }
    
    // For SELECT queries
    let rows;
    if (Array.isArray(params) && params.length > 0) {
      const stmt = this.prepare(sql);
      rows = stmt.all(...params);
    } else if (typeof params === 'function') {
      // No params, only callback
      callback = params;
      rows = this.prepare(sql).all();
    } else {
      rows = this.prepare(sql).all();
    }
    
    if (callback) callback(null, rows);
    return rows;
  } catch (err) {
    console.error('Database error:', err);
    if (callback) callback(err);
    throw err;
  }
};

// Initialize the database schema
const initDatabase = () => {
  // Create tables
  db.exec(`
    -- Create students table
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      bio TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create exams table
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      duration INTEGER NOT NULL DEFAULT 15,
      total_questions INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create exam_questions table
    CREATE TABLE IF NOT EXISTS exam_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT NOT NULL,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    -- Create exam_attempts table
    CREATE TABLE IF NOT EXISTS exam_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      exam_id INTEGER NOT NULL,
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP NULL,
      completed BOOLEAN DEFAULT 0,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    -- Create exam_results table
    CREATE TABLE IF NOT EXISTS exam_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      exam_id INTEGER NOT NULL,
      score REAL NOT NULL,
      completion_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    -- Create student_answers table
    CREATE TABLE IF NOT EXISTS student_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option TEXT,
      FOREIGN KEY (result_id) REFERENCES exam_results(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
    );
  `);
  
  // Check if we need to insert sample data
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  
  if (studentCount === 0) {
    // Insert sample data
    // Insert a sample student
    db.prepare(`
      INSERT INTO students (fullname, username, email, password, bio) 
      VALUES (?, ?, ?, ?, ?)
    `).run('John Doe', 'john', 'john@example.com', 'password123', 'I am a student interested in computer science.');
    
    // Insert sample exams
    const examInsertStmt = db.prepare(`
      INSERT INTO exams (title, description, duration, total_questions) 
      VALUES (?, ?, ?, ?)
    `);
    
    examInsertStmt.run('Introduction to Mathematics', 'Basic mathematics concepts test', 15, 10);
    examInsertStmt.run('Computer Science Fundamentals', 'Test covering basic CS concepts', 30, 10);
    
    // Get the exam IDs
    const mathExamId = db.prepare('SELECT id FROM exams WHERE title = ?').get('Introduction to Mathematics').id;
    const csExamId = db.prepare('SELECT id FROM exams WHERE title = ?').get('Computer Science Fundamentals').id;
    
    // Insert sample questions for Math exam
    const questionInsertStmt = db.prepare(`
      INSERT INTO exam_questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Basic Math Questions
    questionInsertStmt.run(mathExamId, 'What is 2 + 2?', '3', '4', '5', '6', 'B');
    questionInsertStmt.run(mathExamId, 'What is 10 * 5?', '50', '60', '40', '55', 'A');
    questionInsertStmt.run(mathExamId, 'What is the square root of 16?', '2', '3', '4', '6', 'C');
    questionInsertStmt.run(mathExamId, 'If x + 5 = 12, what is the value of x?', '5', '7', '8', '17', 'B');
    questionInsertStmt.run(mathExamId, 'What is the area of a rectangle with length 8 units and width 3 units?', '11 square units', '24 square units', '16 square units', '18 square units', 'B');
    questionInsertStmt.run(mathExamId, 'Which of the following is a prime number?', '9', '15', '17', '21', 'C');
    questionInsertStmt.run(mathExamId, 'What is 20% of 80?', '4', '8', '16', '20', 'C');
    questionInsertStmt.run(mathExamId, 'If 3x = 15, then x = ?', '3', '5', '12', '45', 'B');
    questionInsertStmt.run(mathExamId, 'What is the next number in the sequence: 2, 4, 8, 16, ...?', '18', '24', '32', '64', 'C');
    questionInsertStmt.run(mathExamId, 'If a triangle has angles of 45°, 45°, and 90°, what type of triangle is it?', 'Equilateral', 'Isosceles', 'Scalene', 'Obtuse', 'B');
    
    // Computer Science Questions
    questionInsertStmt.run(csExamId, 'What does CPU stand for?', 'Central Processing Unit', 'Central Program Unit', 'Computer Personal Unit', 'Central Processor Unifier', 'A');
    questionInsertStmt.run(csExamId, 'Which of these is not a programming language?', 'Java', 'Python', 'Microsoft', 'C++', 'C');
    questionInsertStmt.run(csExamId, 'What does HTML stand for?', 'Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Hyper Text Modern Links', 'A');
    questionInsertStmt.run(csExamId, 'What is the purpose of CSS in web development?', 'To define the structure of a webpage', 'To add interactivity to a webpage', 'To style the visual presentation of a webpage', 'To handle server-side logic', 'C');
    questionInsertStmt.run(csExamId, 'Which of the following is not a data structure?', 'Array', 'Queue', 'Tree', 'Function', 'D');
    questionInsertStmt.run(csExamId, 'What does SQL stand for?', 'Structured Query Language', 'Simple Question Language', 'System Quality License', 'Standard Query Lookup', 'A');
    questionInsertStmt.run(csExamId, 'Which of the following is a client-side scripting language?', 'PHP', 'JavaScript', 'Python', 'Java', 'B');
    questionInsertStmt.run(csExamId, 'What is the correct way to declare a variable in JavaScript?', 'variable x;', 'var = x;', 'var x;', 'x = var;', 'C');
    questionInsertStmt.run(csExamId, 'What does DNS stand for?', 'Domain Name System', 'Data Network Service', 'Digital Network Security', 'Dynamic Node Server', 'A');
    questionInsertStmt.run(csExamId, 'Which of the following is not a database management system?', 'MySQL', 'MongoDB', 'Oracle', 'Photoshop', 'D');
    
    console.log('Sample data inserted into the database');
  }
};

// Initialize the database
initDatabase();

console.log('Connected to SQLite database');

// For compatibility with the existing code
db.end = function() {
  this.close();
};

module.exports = db;
