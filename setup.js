// setup.js - Run this script to initialize the database and create required directories
const fs = require('fs');
const path = require('path');

// Ensure the data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  console.log('Creating data directory...');
  fs.mkdirSync(dataDir);
  console.log('Data directory created.');
} else {
  console.log('Data directory already exists.');
}

// Initialize the database
console.log('Initializing database...');
require('./db');
console.log('Database initialization complete.');

console.log('\n===== Setup Complete =====');
console.log('To start the application, run: node index.js');
console.log('Then open your browser and navigate to: http://localhost:5000');
console.log('Default login credentials:');
console.log('  Username: john');
console.log('  Password: password123');