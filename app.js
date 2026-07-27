const express = require('express');
const app = express();
const port = 3000;

const tasks = [{ id: 1, title: 'Sample Task', done: false }, { id: 2, title: 'Another Task', done: true }, { id: 3, title: 'Third Task', done: false }];

app.get('/', (req, res) => {
    res.json({ "name": "Task API", "version": "1.0", "endpoints": ["/tasks"] });
});

app.get('/health', (req, res) => {
    res.json({ "status": "ok" });
});

app.get('/tasks', (req, res) => {
    res.send(tasks);
});

app.get('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);
    const task = tasks.find(obj => obj.id === taskId);

    if (!task) {
        return res.status(404).json({ "error": `Task ${taskId} not found` });
    }
    res.send(task);
});



app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});