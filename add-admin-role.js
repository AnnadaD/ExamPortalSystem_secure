/**
 * Admin Role Creation Script
 * 
 * This script adds a role field to the students table and creates an admin user.
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('./data/exam_portal.db');

console.log('Starting admin role enhancement...');

// Begin transaction
db.prepare('BEGIN TRANSACTION').run();

try {
  // Check if role column exists in students table
  const tableInfo = db.prepare("PRAGMA table_info(students)").all();
  const roleExists = tableInfo.some(column => column.name === 'role');
  
  if (!roleExists) {
    // Add role column to students table
    db.prepare('ALTER TABLE students ADD COLUMN role TEXT DEFAULT "student"').run();
    console.log('Added role field to students table');
  }

  // Check if admin user exists
  const adminExists = db.prepare("SELECT COUNT(*) as count FROM students WHERE role = 'admin'").get().count > 0;
  
  if (!adminExists) {
    // Create admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO students (fullname, username, email, password, role, bio) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('System Administrator', 'admin', 'admin@school.edu', adminPassword, 'admin', 'System Administrator Account');
    
    console.log('Created admin user (username: admin, password: admin123)');
  } else {
    console.log('Admin user already exists');
  }

  // Commit transaction
  db.prepare('COMMIT').run();
  console.log('Admin role enhancement completed successfully!');
  
} catch (error) {
  // Rollback transaction on error
  db.prepare('ROLLBACK').run();
  console.error('Error creating admin role:', error.message);
}

// Close database connection
db.close();