const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize Database
const db = new Database('tasks.db', { verbose: console.log });

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed Database if empty
const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;

if (taskCount === 0) {
  console.log('Database is empty. Seeding initial tasks...');
  const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  const insertMany = db.transaction((tasks) => {
    for (const task of tasks) insert.run(task.title, task.done);
  });
  
  insertMany([
    { title: 'Setup the Express API', done: 1 },
    { title: 'Review PR for the new feature', done: 0 },
    { title: 'Update documentation', done: 0 }
  ]);
}

// ==========================================
// API ROUTES
// ==========================================

// GET / - Basic API metadata
app.get('/', (req, res) => {
  res.json({
    name: 'Task Management API',
    version: '1.0.0',
    description: 'A simple API to manage tasks/todos'
  });
});

// GET /health - Health status
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /tasks - List all tasks
app.get('/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  res.json(tasks);
});

// POST /tasks - Create a new task
app.post('/tasks', (req, res) => {
  const { title } = req.body;
  
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required and must not be null' });
  }

  const stmt = db.prepare('INSERT INTO tasks (title, done) VALUES (?, 0)');
  const info = stmt.run(title);
  
  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(newTask);
});

// GET /tasks/:id - Retrieve specific task
app.get('/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Returning 201 as specifically requested
  res.status(201).json(task);
});

// PUT /tasks/:id - Update specific task
app.put('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, done } = req.body;

  if (title === null || title === '') {
    return res.status(400).json({ error: 'Title cannot be null' });
  }

  const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  
  if (!existingTask) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Use new values if provided, otherwise fallback to existing values
  const updatedTitle = title !== undefined ? title : existingTask.title;
  const updatedDone = done !== undefined ? (done ? 1 : 0) : existingTask.done;

  const stmt = db.prepare(`
    UPDATE tasks 
    SET title = ?, done = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  stmt.run(updatedTitle, updatedDone, id);
  
  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  
  // Returning 201 as specifically requested
  res.status(201).json(updatedTask);
});

// DELETE /tasks/:id - Delete a task
app.delete('/tasks/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  const info = stmt.run(req.params.id);
  
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  res.status(200).json({ message: 'Task successfully deleted' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});