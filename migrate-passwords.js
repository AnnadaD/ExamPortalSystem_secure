// migrate-passwords.js - Script to update existing plain text passwords to bcrypt hashes
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('Starting password migration...');

// Ensure the data directory exists
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'exam_portal.db');

if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at ${dbPath}`);
  console.error('Please run setup-local.js first to create the database');
  process.exit(1);
}

// Connect to the database
console.log(`Connecting to database at ${dbPath}...`);
const db = new Database(dbPath);

try {
  // Get all students with plain text passwords (those not starting with $2a$ or $2b$)
  console.log('Finding students with plain text passwords...');
  const students = db.prepare(`
    SELECT id, username, password 
    FROM students 
    WHERE password NOT LIKE '$2a$%' 
    AND password NOT LIKE '$2b$%'
  `).all();

  console.log(`Found ${students.length} students with plain text passwords.`);

  if (students.length > 0) {
    // Begin a transaction
    const updateTransaction = db.transaction(() => {
      const updateStmt = db.prepare('UPDATE students SET password = ? WHERE id = ?');
      
      students.forEach(student => {
        const hashedPassword = bcrypt.hashSync(student.password, 10);
        console.log(`Updating password for student ${student.username}...`);
        updateStmt.run(hashedPassword, student.id);
      });
    });

    // Execute the transaction
    updateTransaction();
    console.log('All passwords have been successfully hashed with bcrypt.');
  } else {
    console.log('No plain text passwords found in the database.');
  }

  // Verify the update
  const verifyStudents = db.prepare(`
    SELECT username, password 
    FROM students
  `).all();

  console.log('\nVerification:');
  verifyStudents.forEach(student => {
    console.log(`- ${student.username}: ${student.password.substring(0, 20)}...`);
  });

} catch (err) {
  console.error('Error during password migration:', err);
} finally {
  // Close the database connection
  db.close();
  console.log('Database connection closed.');
}

console.log('\n===== Password Migration Complete =====');