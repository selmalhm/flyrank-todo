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
      done BIT
    )
`);

const numberOfRows = db.prepare("SELECT COUNT(*) AS count FROM tasks;").get();

if (numberOfRows.count === 0) {
    const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?);");

    insert.run("firstTask", 0);
    insert.run("secondTask", 1);
    insert.run("thirdTask", 0);
}

const tasks = db.prepare("SELECT * FROM tasks").all();

app.get('/', (req, res) => {
    res.json({ "name": "Task API", "version": "1.0", "endpoints": ["/tasks"] });
});

app.get('/health', (req, res) => {
    res.json({ "status": "ok" });
});

app.get('/tasks', (req, res) => {
    let filteredTasks = tasks;
    if (req.query.done) {
        filteredTasks = filteredTasks.filter(obj => obj.done == req.query.done);
    }

    if (req.query.search) {
        const searchTerm = req.query.search.toLowerCase();
        const searchQuery = db.prepare("SELECT * FROM tasks WHERE title LIKE ?;").all(searchTerm)
        filteredTasks = searchQuery;
    }

    res.send(filteredTasks)
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
    const totalTasks = tasks.length;
    let doneTasks = 0;
    let OpenTasks = 0;

    for (let task of tasks) {
        if (task.done) {
            doneTasks++;
        } else {
            OpenTasks++;
        }
    }

    res.send({ "total": totalTasks, "done": doneTasks, "open": OpenTasks })
});

app.post('/tasks', (req, res) => {
    const newTask = req.body;
    const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");

    if (!newTask.title) {
        return res.status(400).json({ "error": "Task title is required" });
    }
    insert.run(newTask.title, 0);
    app.get('/tasks', (req, res));
    res.status(201).json({ "message": "Task created", "task": newTask });
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

    db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?")
        .run(updatedTitle, updatedDone, taskId);


    app.get('/tasks', (req, res));

    res.status(200).json({
        "message": `Task ${taskId} updated`,
        "task": {
            id: taskId,
            title: updatedTitle,
            done: updatedDone
        }
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

    app.get('/tasks', (req, res));

    res.status(200).json({});
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});

// db.close(); // Removed to keep the database connection open