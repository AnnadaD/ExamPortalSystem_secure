/**
 * Security Enhancement Script
 * 
 * This script adds a security_logs table to track potential security violations.
 */

const Database = require('better-sqlite3');
const db = new Database('./data/exam_portal.db');

console.log('Starting security enhancement...');

// Begin transaction
db.prepare('BEGIN TRANSACTION').run();

try {
  // Create security logs table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      exam_id INTEGER,
      attempt_id INTEGER,
      log_type TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (exam_id) REFERENCES exams(id),
      FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id)
    )
  `).run();
  
  console.log('Security logs table created successfully');
  
  // Create index for faster queries
  db.prepare('CREATE INDEX IF NOT EXISTS idx_security_logs_student ON security_logs(student_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_security_logs_exam ON security_logs(exam_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_security_logs_type ON security_logs(log_type)').run();
  
  // Add security related fields to exam_attempts if they don't exist
  // Checking if ip_address column exists in exam_attempts table
  const tableInfo = db.prepare("PRAGMA table_info(exam_attempts)").all();
  const ipAddressExists = tableInfo.some(column => column.name === 'ip_address');
  
  if (!ipAddressExists) {
    db.prepare('ALTER TABLE exam_attempts ADD COLUMN ip_address TEXT').run();
    db.prepare('ALTER TABLE exam_attempts ADD COLUMN user_agent TEXT').run();
    console.log('Added security tracking fields to exam_attempts table');
  }
  
  // Commit transaction
  db.prepare('COMMIT').run();
  console.log('Security enhancement completed successfully!');
  
} catch (error) {
  // Rollback transaction on error
  db.prepare('ROLLBACK').run();
  console.error('Error enhancing security:', error.message);
}

// Close database connection
db.close();