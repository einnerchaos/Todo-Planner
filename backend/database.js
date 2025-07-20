const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Database file path
const dbPath = path.join(__dirname, 'todo_planner.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Initialize database
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔄 Starting database initialization...');
      
      // Create tables
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#666',
          icon TEXT DEFAULT '📋',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          category_id INTEGER,
          priority TEXT DEFAULT 'medium',
          status TEXT DEFAULT 'pending',
          task_type TEXT DEFAULT 'single',
          due_date DATE,
          start_time TIME,
          end_time TIME,
          start_datetime DATETIME,
          end_datetime DATETIME,
          is_recurring BOOLEAN DEFAULT 0,
          recurring_pattern TEXT,
          reminder_days INTEGER DEFAULT 3,
          reminder_time TIME DEFAULT '09:00',
          snooze_until DATETIME,
          image_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (category_id) REFERENCES categories (id)
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          task_id INTEGER,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          is_read BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (task_id) REFERENCES tasks (id)
        );
      `);

      console.log('✅ Tables created');

      // Clear existing data to prevent duplicates
      db.exec(`
        DELETE FROM tasks;
        DELETE FROM categories;
        DELETE FROM notifications;
        DELETE FROM users WHERE email = 'demo@todoplanner.com';
      `);

      console.log('✅ Existing data cleared');

      // Create demo user and get ID using callback
      db.run(`
        INSERT INTO users (username, email, password_hash) 
        VALUES (?, ?, ?)
      `, ['demo', 'demo@todoplanner.com', 'demo123'], function(err) {
        if (err) {
          console.error('❌ Error creating user:', err);
          reject(err);
          return;
        }
        
        const userId = this.lastID;
        console.log('✅ Demo user created with ID:', userId);
        
        // Insert default categories
        const defaultCategories = [
          [userId, 'Work', '#2196F3', '💼'],
          [userId, 'Personal', '#4CAF50', '👤'],
          [userId, 'Health', '#FF5722', '🏥'],
          [userId, 'Finance', '#FF9800', '💰'],
          [userId, 'Family', '#9C27B0', '👨‍👩‍👧‍👦'],
          [userId, 'Hobbies', '#607D8B', '🎨'],
          [userId, 'Shopping', '#795548', '🛒'],
          [userId, 'Travel', '#00BCD4', '✈️'],
          [userId, 'Home', '#8BC34A', '🏠'],
          [userId, 'Appointments', '#E91E63', '📅'],
          [userId, 'Education', '#3F51B5', '📚'],
          [userId, 'Entertainment', '#FFC107', '🎮']
        ];

        const categoryStmt = db.prepare(`
          INSERT INTO categories (user_id, name, color, icon) 
          VALUES (?, ?, ?, ?)
        `);
        
        defaultCategories.forEach(category => {
          categoryStmt.run(category);
        });
        categoryStmt.finalize();

        console.log('✅ Categories created');

        // Add demo tasks
        const demoTasks = [
          [userId, 'Quarterly Budget Review', 'Review Q2 budget and adjust forecasts', 10, 'high', 'pending', 'single', '2025-04-10', '09:00', '10:30', null, null, 0, null, 3, '08:00', null, null],
          [userId, 'Team Sprint Planning', 'Plan next sprint with development team', 5, 'high', 'pending', 'single', '2025-04-08', '11:00', '12:00', null, null, 0, null, 1, '10:00', null, null],
          [userId, 'Grocery Shopping', 'Buy groceries for the week', 4, 'medium', 'pending', 'single', '2025-04-05', '16:00', '17:00', null, null, 0, null, 1, '15:00', null, null],
          [userId, 'Dentist Appointment', 'Regular dental checkup', 3, 'medium', 'pending', 'single', '2025-04-12', '14:00', '15:00', null, null, 0, null, 2, '13:00', null, null],
          [userId, 'Code Review Session', 'Review pull requests for team', 1, 'medium', 'in-progress', 'timerange', null, null, null, '2025-04-07 10:00', '2025-04-07 12:00', 0, null, 1, '09:00', null, null],
          [userId, 'React Conference Preparation', 'Prepare presentation and materials', 1, 'high', 'pending', 'timerange', null, null, null, '2025-04-15 09:00', '2025-04-17 17:00', 0, null, 5, '08:00', null, null],
          [userId, 'Home Renovation Planning', 'Kitchen renovation planning and execution', 9, 'medium', 'pending', 'timerange', null, null, null, '2025-04-20 08:00', '2025-05-18 18:00', 0, null, 7, '07:00', null, null],
          [userId, 'Parent-Teacher Meeting', 'Discuss progress with teacher', 11, 'medium', 'pending', 'single', '2025-04-15', '15:00', '16:00', null, null, 0, null, 2, '14:00', null, null],
          [userId, 'Car Maintenance', 'Annual car service and inspection', 3, 'medium', 'pending', 'single', '2025-04-25', '10:00', '12:00', null, null, 0, null, 3, '09:00', null, null],
          [userId, 'Book Club Meeting', 'Monthly book club discussion', 12, 'low', 'pending', 'single', '2025-04-15', '19:00', '21:00', null, null, 1, 'monthly', 2, '18:00', null, null],
          [userId, 'Family Birthday Party', 'Organize birthday party for Sarah', 11, 'high', 'pending', 'single', '2025-05-03', '17:00', '22:00', null, null, 0, null, 7, '12:00', null, null],
          [userId, 'Tax Filing Deadline', 'Complete and submit tax returns', 10, 'high', 'pending', 'single', '2025-05-15', '09:00', '11:00', null, null, 0, null, 5, '08:00', null, null],
          [userId, 'Project Launch', 'Launch new product feature', 1, 'high', 'pending', 'single', '2025-05-30', '14:00', '16:00', null, null, 0, null, 3, '13:00', null, null],
          [userId, 'Summer Vacation Planning', 'Plan and book summer vacation', 8, 'medium', 'pending', 'timerange', null, null, null, '2025-05-01 09:00', '2025-05-30 17:00', 0, null, 10, '08:00', null, null],
          [userId, 'Garden Planting', 'Plant spring vegetables and flowers', 9, 'low', 'pending', 'timerange', null, null, null, '2025-05-10 08:00', '2025-05-10 12:00', 0, null, 1, '07:00', null, null],
          [userId, 'Team Building Event', 'Annual company team building', 5, 'medium', 'pending', 'timerange', null, null, null, '2025-05-15 09:00', '2025-05-16 17:00', 0, null, 5, '08:00', null, null],
          [userId, 'Insurance Renewal', 'Renew car and home insurance', 10, 'high', 'pending', 'single', '2025-05-20', '10:00', '11:00', null, null, 0, null, 2, '09:00', null, null],
          [userId, 'Photography Workshop', 'Learn advanced photography techniques', 12, 'low', 'pending', 'timerange', null, null, null, '2025-05-25 10:00', '2025-05-25 16:00', 0, null, 1, '09:00', null, null],
          [userId, 'Annual Health Checkup', 'Full medical checkup at clinic', 3, 'high', 'pending', 'single', '2025-06-15', '10:00', '11:00', null, null, 0, null, 2, '09:00', null, null],
          [userId, 'React Conference', 'Attend React Europe 2025', 1, 'high', 'pending', 'timerange', null, null, null, '2025-06-20 09:00', '2025-06-22 18:00', 0, null, 5, '08:00', null, null],
          [userId, 'School Registration', 'Register kids for new school year', 11, 'high', 'pending', 'single', '2025-06-05', '09:00', '11:00', null, null, 0, null, 3, '08:00', null, null],
          [userId, 'Back-to-School Shopping', 'Buy school supplies for kids', 4, 'medium', 'pending', 'timerange', null, null, null, '2025-06-25 10:00', '2025-06-27 16:00', 0, null, 5, '09:00', null, null],
          [userId, 'Quarterly Performance Review', 'Review team performance and goals', 1, 'high', 'pending', 'single', '2025-06-10', '14:00', '16:00', null, null, 0, null, 2, '13:00', null, null],
          [userId, 'Hiking Trip', 'Weekend hiking trip with friends', 8, 'medium', 'pending', 'timerange', null, null, null, '2025-06-28 08:00', '2025-06-29 18:00', 0, null, 3, '07:00', null, null],
          [userId, 'Home Security Upgrade', 'Install new security system', 9, 'medium', 'pending', 'timerange', null, null, null, '2025-06-12 09:00', '2025-06-12 17:00', 0, null, 1, '08:00', null, null],
          [userId, 'Cooking Class', 'Learn to cook Italian cuisine', 12, 'low', 'pending', 'timerange', null, null, null, '2025-06-18 18:00', '2025-06-18 21:00', 0, null, 1, '17:00', null, null],
          [userId, 'Vacation in Italy', 'Family summer vacation', 8, 'medium', 'pending', 'timerange', null, null, null, '2025-07-10 08:00', '2025-07-20 22:00', 0, null, 10, '07:00', null, null],
          [userId, 'Quarterly Board Meeting', 'Present quarterly results to board', 1, 'high', 'pending', 'single', '2025-07-25', '10:00', '12:00', null, null, 0, null, 3, '09:00', null, null],
          [userId, 'Swimming Lessons', 'Kids swimming lessons', 11, 'medium', 'pending', 'timerange', null, null, null, '2025-07-05 15:00', '2025-07-05 16:00', 1, 'weekly', 1, '14:00', null, null],
          [userId, 'Home Office Setup', 'Set up new home office equipment', 9, 'medium', 'pending', 'timerange', null, null, null, '2025-07-30 09:00', '2025-07-30 17:00', 0, null, 1, '08:00', null, null],
          [userId, 'Golf Tournament', 'Annual company golf tournament', 5, 'low', 'pending', 'timerange', null, null, null, '2025-07-15 08:00', '2025-07-15 18:00', 0, null, 2, '07:00', null, null],
          [userId, 'Music Festival', 'Attend local music festival', 12, 'low', 'pending', 'timerange', null, null, null, '2025-07-26 16:00', '2025-07-27 02:00', 0, null, 1, '15:00', null, null],
          [userId, 'Back-to-School Preparation', 'Prepare kids for new school year', 11, 'high', 'pending', 'timerange', null, null, null, '2025-08-01 09:00', '2025-08-31 17:00', 0, null, 7, '08:00', null, null],
          [userId, 'Product Launch', 'Launch major product update', 1, 'high', 'pending', 'single', '2025-08-15', '14:00', '16:00', null, null, 0, null, 3, '13:00', null, null],
          [userId, 'Family Reunion', 'Annual family reunion', 11, 'medium', 'pending', 'timerange', null, null, null, '2025-08-22 12:00', '2025-08-24 18:00', 0, null, 5, '11:00', null, null],
          [userId, 'Home Renovation', 'Complete kitchen renovation', 9, 'medium', 'pending', 'timerange', null, null, null, '2025-08-05 08:00', '2025-08-20 18:00', 0, null, 7, '07:00', null, null],
          [userId, 'Tech Conference', 'Attend annual tech conference', 1, 'medium', 'pending', 'timerange', null, null, null, '2025-08-28 09:00', '2025-08-30 17:00', 0, null, 5, '08:00', null, null],
          [userId, 'Beach Trip', 'Weekend beach trip', 8, 'low', 'pending', 'timerange', null, null, null, '2025-08-09 08:00', '2025-08-10 20:00', 0, null, 2, '07:00', null, null],
          [userId, 'Q3 Planning', 'Plan Q3 business strategy', 1, 'high', 'pending', 'timerange', null, null, null, '2025-09-05 09:00', '2025-09-05 17:00', 0, null, 3, '08:00', null, null],
          [userId, 'Fall Cleaning', 'Complete fall cleaning of house', 9, 'medium', 'pending', 'timerange', null, null, null, '2025-09-12 08:00', '2025-09-12 16:00', 0, null, 1, '07:00', null, null],
          [userId, 'Parent-Teacher Conference', 'Fall parent-teacher conference', 11, 'high', 'pending', 'single', '2025-09-18', '15:00', '16:00', null, null, 0, null, 2, '14:00', null, null],
          [userId, 'Holiday Planning', 'Start planning holiday season', 11, 'medium', 'pending', 'timerange', null, null, null, '2025-09-25 10:00', '2025-09-25 16:00', 0, null, 5, '09:00', null, null],
          [userId, 'Fitness Challenge', 'Start 30-day fitness challenge', 3, 'medium', 'pending', 'timerange', null, null, null, '2025-09-01 06:00', '2025-09-30 07:00', 1, 'daily', 1, '05:00', null, null],
          [userId, 'Art Exhibition', 'Visit local art exhibition', 12, 'low', 'pending', 'timerange', null, null, null, '2025-09-20 14:00', '2025-09-20 18:00', 0, null, 1, '13:00', null, null],
          [userId, 'Halloween Party', 'Organize Halloween party for kids', 11, 'medium', 'pending', 'single', '2025-10-31', '18:00', '22:00', null, null, 0, null, 3, '17:00', null, null],
          [userId, 'Quarterly Review', 'Q3 performance review', 1, 'high', 'pending', 'single', '2025-10-15', '10:00', '12:00', null, null, 0, null, 3, '09:00', null, null],
          [userId, 'Home Maintenance', 'Annual home maintenance check', 9, 'medium', 'pending', 'timerange', null, null, null, '2025-10-10 09:00', '2025-10-10 17:00', 0, null, 2, '08:00', null, null],
          [userId, 'Pumpkin Picking', 'Family pumpkin picking trip', 11, 'low', 'pending', 'timerange', null, null, null, '2025-10-12 10:00', '2025-10-12 16:00', 0, null, 1, '09:00', null, null],
          [userId, 'Professional Development', 'Attend professional development workshop', 1, 'medium', 'pending', 'timerange', null, null, null, '2025-10-25 09:00', '2025-10-25 17:00', 0, null, 3, '08:00', null, null],
          [userId, 'Fall Hiking', 'Autumn hiking trip', 8, 'low', 'pending', 'timerange', null, null, null, '2025-10-19 08:00', '2025-10-19 18:00', 0, null, 2, '07:00', null, null],
          [userId, 'Thanksgiving Preparation', 'Prepare for Thanksgiving dinner', 11, 'high', 'pending', 'timerange', null, null, null, '2025-11-25 09:00', '2025-11-27 22:00', 0, null, 5, '08:00', null, null],
          [userId, 'Black Friday Shopping', 'Holiday shopping planning', 4, 'medium', 'pending', 'timerange', null, null, null, '2025-11-28 06:00', '2025-11-28 18:00', 0, null, 1, '05:00', null, null],
          [userId, 'Year-End Planning', 'Plan year-end business activities', 1, 'high', 'pending', 'timerange', null, null, null, '2025-11-10 09:00', '2025-11-10 17:00', 0, null, 3, '08:00', null, null],
          [userId, 'Holiday Decorations', 'Put up holiday decorations', 9, 'medium', 'pending', 'timerange', null, null, null, '2025-11-15 10:00', '2025-11-15 16:00', 0, null, 2, '09:00', null, null],
          [userId, 'Family Photos', 'Annual family photo session', 11, 'medium', 'pending', 'single', '2025-11-22', '14:00', '16:00', null, null, 0, null, 2, '13:00', null, null],
          [userId, 'Charity Event', 'Volunteer at local charity event', 12, 'low', 'pending', 'timerange', null, null, null, '2025-11-08 10:00', '2025-11-08 16:00', 0, null, 1, '09:00', null, null],
          [userId, 'Christmas Shopping', 'Complete holiday shopping', 4, 'high', 'pending', 'timerange', null, null, null, '2025-12-01 10:00', '2025-12-20 18:00', 0, null, 7, '09:00', null, null],
          [userId, 'Year-End Review', 'Annual performance review', 1, 'high', 'pending', 'single', '2025-12-15', '10:00', '12:00', null, null, 0, null, 3, '09:00', null, null],
          [userId, 'Christmas Party', 'Company Christmas party', 5, 'medium', 'pending', 'single', '2025-12-18', '18:00', '22:00', null, null, 0, null, 2, '17:00', null, null],
          [userId, 'Family Christmas', 'Christmas with family', 11, 'high', 'pending', 'timerange', null, null, null, '2025-12-24 16:00', '2025-12-26 20:00', 0, null, 5, '15:00', null, null],
          [userId, 'New Year Planning', 'Plan for new year goals', 12, 'medium', 'pending', 'timerange', null, null, null, '2025-12-30 10:00', '2025-12-30 16:00', 0, null, 2, '09:00', null, null],
          [userId, 'New Year Party', 'New Year celebration', 12, 'low', 'pending', 'single', '2025-12-31', '20:00', '02:00', null, null, 0, null, 1, '19:00', null, null],
          [userId, 'Guitar Practice', 'Daily practice session', 12, 'low', 'pending', 'timerange', null, null, null, '2025-04-01 19:00', '2025-04-01 20:00', 1, 'daily', 1, '18:00', null, null],
          [userId, 'Mortgage Payment', 'Monthly mortgage payment', 10, 'high', 'pending', 'single', '2025-04-01', '09:00', '09:15', null, null, 1, 'monthly', 1, '08:00', null, null],
          [userId, 'Gym Workout', 'Weekly gym session', 3, 'medium', 'pending', 'timerange', null, null, null, '2025-04-02 18:00', '2025-04-02 19:30', 1, 'weekly', 1, '17:00', null, null],
          [userId, 'Team Standup', 'Daily team standup meeting', 5, 'medium', 'pending', 'timerange', null, null, null, '2025-04-01 09:00', '2025-04-01 09:15', 1, 'daily', 1, '08:00', null, null],
          [userId, 'Weekly Review', 'Weekly task review and planning', 1, 'medium', 'pending', 'single', '2025-04-06', '16:00', '17:00', null, null, 1, 'weekly', 1, '15:00', null, null],
          [userId, 'Q1 Report Review', 'Review quarterly performance report', 1, 'high', 'completed', 'single', '2025-03-31', '14:00', '15:30', null, null, 0, null, 1, '13:00', null, null],
          [userId, 'Spring Cleaning', 'Complete spring cleaning of house', 9, 'medium', 'completed', 'timerange', null, null, null, '2025-03-20 09:00', '2025-03-22 17:00', 0, null, 3, '08:00', null, null],
          [userId, 'Insurance Renewal', 'Renew car and home insurance', 10, 'high', 'completed', 'single', '2025-03-15', '10:00', '11:00', null, null, 0, null, 2, '09:00', null, null]
        ];
        
        const stmt = db.prepare(`INSERT INTO tasks (user_id, title, description, category_id, priority, status, task_type, due_date, start_time, end_time, start_datetime, end_datetime, is_recurring, recurring_pattern, reminder_days, reminder_time, snooze_until, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        demoTasks.forEach(task => {
          stmt.run(task);
        });
        stmt.finalize();

        console.log('✅ Demo tasks created');
        console.log('✅ Database initialized successfully');
        resolve();
      });
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      reject(error);
    }
  });
};

// Helper functions for database operations
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

module.exports = {
  db,
  initDatabase,
  dbGet,
  dbAll,
  dbRun
}; 