-- Create the database
CREATE DATABASE IF NOT EXISTS exam_portal;
USE exam_portal;

-- Drop tables if they exist
DROP TABLE IF EXISTS student_answers;
DROP TABLE IF EXISTS exam_results;
DROP TABLE IF EXISTS exam_attempts;
DROP TABLE IF EXISTS exam_questions;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS students;

-- Create students table
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullname VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL,
  password VARCHAR(100) NOT NULL, -- Intentionally not using password hashing
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create exams table
CREATE TABLE exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration INT NOT NULL DEFAULT 15, -- in minutes
  total_questions INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create exam_questions table
CREATE TABLE exam_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Create exam_attempts table
CREATE TABLE exam_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  exam_id INT NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  completed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Create exam_results table
CREATE TABLE exam_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  exam_id INT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  completion_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Create student_answers table
CREATE TABLE student_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  result_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_option CHAR(1),
  FOREIGN KEY (result_id) REFERENCES exam_results(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
);

-- Insert sample data
-- Insert a sample student
INSERT INTO students (fullname, username, email, password, bio) VALUES
('John Doe', 'john', 'john@example.com', 'password123', 'I am a student interested in computer science.');

-- Insert sample exams
INSERT INTO exams (title, description, duration, total_questions) VALUES
('Introduction to Mathematics', 'Basic mathematics concepts test', 15, 3),
('Computer Science Fundamentals', 'Test covering basic CS concepts', 30, 3);

-- Insert sample questions for Math exam
INSERT INTO exam_questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES
(1, 'What is 2 + 2?', '3', '4', '5', '6', 'B'),
(1, 'What is 10 * 5?', '50', '60', '40', '55', 'A'),
(1, 'What is the square root of 16?', '2', '3', '4', '6', 'C');

-- Insert sample questions for CS exam
INSERT INTO exam_questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES
(2, 'What does CPU stand for?', 'Central Processing Unit', 'Central Program Unit', 'Computer Personal Unit', 'Central Processor Unifier', 'A'),
(2, 'Which of these is not a programming language?', 'Java', 'Python', 'Microsoft', 'C++', 'C'),
(2, 'What does HTML stand for?', 'Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Hyper Text Modern Links', 'A');
