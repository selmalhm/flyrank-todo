const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const Database = require('better-sqlite3');

const app = express();
const port = 3000;
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());

const db = new Database('tasks.db');
db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      done BIT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    )
`);

const numberOfRows = db.prepare("SELECT COUNT(*) AS count FROM tasks;").get();

if (numberOfRows.count === 0) {
    const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?);");

    insert.run("firstTask", 0);
    insert.run("secondTask", 1);
    insert.run("thirdTask", 0);
}



app.get('/', (req, res) => {
    res.json({ "name": "Task API", "version": "1.0", "endpoints": ["/tasks"] });
});

app.get('/health', (req, res) => {
    res.json({ "status": "ok" });
});

app.get('/tasks', (req, res) => {
    if (req.query.done) {
        return res.send(db.prepare("SELECT * FROM tasks WHERE done = ?").all(req.query.done));
    }

    if (req.query.search) {
        const searchTerm = req.query.search.toLowerCase();
        return res.send(db.prepare("SELECT * FROM tasks WHERE LOWER(title) LIKE ?;").all(searchTerm));
    }

    const allTasks = db.prepare("SELECT * FROM tasks").all();
    res.send(allTasks);
});

app.get('/tasks/:id', (req, res) => {
    const request = db.prepare("SELECT * FROM tasks WHERE id = ?");
    const taskId = parseInt(req.params.id);
    const task = request.get(taskId)

    if (!task) {
        return res.status(404).json({ "error": `Task ${taskId} not found` });
    }
    res.send(task);
});

app.get('/stats', (req, res) => {
    const countDone = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE done = 1;").get();
    const countTodo = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE done = 0;").get();
    const totalTasks = db.prepare("SELECT COUNT(*) AS count FROM tasks;").get();

    res.send({ "total": totalTasks, "done": countDone, "open": countTodo })
});

app.post('/tasks', (req, res) => {
    const newTask = req.body;

    if (!newTask.title) {
        return res.status(400).json({ "error": "Task title is required" });
    }
    const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?) RETURNING *");
    const createdTask = insert.get(newTask.title, 0);

    res.status(201).json({ "message": "Task created", "task": createdTask });
});

app.put('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
        return res.status(400).json({ "error": "Invalid task ID" });
    }

    if (req.body.title === undefined && req.body.done === undefined) {
        return res.status(400).json({ "error": "Task title or done status is required" });
    }

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);

    if (!task) {
        return res.status(404).json({ "error": `Task ${taskId} not found` });
    }

    const updatedTitle = req.body.title ?? task.title;
    const updatedDone = req.body.done ?? task.done;

    const updatedTask = db.prepare(`
        UPDATE tasks 
        SET title = ?, done = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? 
        RETURNING *
    `).get(updatedTitle, updatedDone, taskId);

    res.status(200).json({
        "message": `Task ${taskId} updated`,
        "task": updatedTask
    });
});

app.delete('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
        return res.status(400).json({ "error": "Invalid task ID" });
    }

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);

    if (!task) {
        return res.status(404).json({ "error": `Task ${taskId} not found` });
    }

    db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);

    res.status(200).json({});
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
