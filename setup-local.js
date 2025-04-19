// setup-local.js - Run this script to initialize the database and create required directories
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('Starting setup process...');

// Ensure the data directory exists
const dataDir = path.join(__dirname, 'data');
console.log(`Checking for data directory at: ${dataDir}`);

if (!fs.existsSync(dataDir)) {
  console.log('Creating data directory...');
  try {
    fs.mkdirSync(dataDir);
    console.log('Data directory created successfully.');
  } catch (err) {
    console.error('Error creating data directory:', err);
    process.exit(1);
  }
} else {
  console.log('Data directory already exists.');
}

// Initialize the database
console.log('Initializing database...');
const dbPath = path.join(dataDir, 'exam_portal.db');
console.log(`Database will be created at: ${dbPath}`);

try {
  const db = new Database(dbPath);
  console.log('Database connection established.');

  // Create tables
  console.log('Creating database tables...');
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
  console.log('Database tables created successfully.');

  // Check if we need to insert sample data
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  console.log(`Found ${studentCount} existing students in the database.`);
  
  if (studentCount === 0) {
    console.log('Inserting sample data...');
    
    // Insert a sample student
    db.prepare(`
      INSERT INTO students (fullname, username, email, password, bio) 
      VALUES (?, ?, ?, ?, ?)
    `).run('John Doe', 'john', 'john@example.com', 'password123', 'I am a student interested in computer science.');
    console.log('Sample student created.');
    
    // Insert sample exams
    const examInsertStmt = db.prepare(`
      INSERT INTO exams (title, description, duration, total_questions) 
      VALUES (?, ?, ?, ?)
    `);
    
    examInsertStmt.run('Introduction to Mathematics', 'Basic mathematics concepts test', 15, 10);
    examInsertStmt.run('Computer Science Fundamentals', 'Test covering basic CS concepts', 30, 10);
    console.log('Sample exams created.');
    
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
    
    console.log('Sample questions created.');
  }

  // Close the database connection
  db.close();
  console.log('Database connection closed.');

  console.log('\n===== Setup Complete =====');
  console.log('To start the application, run: node index.js');
  console.log('Then open your browser and navigate to: http://127.0.0.1:5000');
  console.log('Default login credentials:');
  console.log('  Username: john');
  console.log('  Password: password123');

} catch (err) {
  console.error('Error setting up database:', err);
  process.exit(1);
}