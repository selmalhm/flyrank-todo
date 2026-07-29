const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');

const app = express();
const port = 3000;
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());

const toBool = (string) => string === 'true';

const tasks = [{ id: 1, title: 'Sample Task', done: false }, { id: 2, title: 'Another Task', done: true }, { id: 3, title: 'Third Task', done: false }];

app.get('/', (req, res) => {
    res.json({ "name": "Task API", "version": "1.0", "endpoints": ["/tasks"] });
});

app.get('/health', (req, res) => {
    res.json({ "status": "ok" });
});

app.get('/tasks', (req, res) => {
    let filteredTasks = tasks;
    if (req.query.done) {
        filteredTasks = filteredTasks.filter(obj => obj.done === toBool(req.query.done));
    }

    if (req.query.search) {
        const searchTerm = req.query.search.toLowerCase();
        filteredTasks = filteredTasks.filter(obj => obj.title.toLowerCase().includes(searchTerm));
    }

    res.send(filteredTasks)
});

app.get('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);
    const task = tasks.find(obj => obj.id === taskId);

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

    res.send({"total": totalTasks, "done": doneTasks, "open": OpenTasks})
});

app.post('/tasks', (req, res) => {
    const newTask = req.body;
    if (!newTask.title) {
        return res.status(400).json({ "error": "Task title is required" });
    }
    tasks.push({ id: tasks.length + 1, title: newTask.title, done: false });
    res.status(201).json({ "message": "Task created", "task": newTask });
});

app.put('/tasks/:id', (req, res) => {
    const updateTaskId = parseInt(req.params.id);
    const updateTask = tasks.find(obj => obj.id === updateTaskId);

    if (!updateTask) {
        return res.status(404).json({ "error": `Task ${updateTaskId} not found` });
    }

    if (req.body.title === undefined && req.body.done === undefined) {
        return res.status(400).json({ "error": "Task title or done status is required" });
    }

    !(req.body.title === undefined) ? updateTask.title = req.body.title : updateTask.title = updateTask.title;
    !(req.body.done === undefined) ? updateTask.done = req.body.done : updateTask.done = updateTask.done;


    res.status(200).json({ "message": `Task ${updateTaskId} updated`, "task": updateTask });

})

app.delete('/tasks/:id', (req, res) => {
    const deleteTaskId = parseInt(req.params.id);
    const deleteTaskIndex = tasks.findIndex(obj => obj.id === deleteTaskId);

    if (deleteTaskIndex === undefined) {
        return res.status(404).json({ "error": `Task ${deleteTaskId} not found` });
    }

    tasks.splice(deleteTaskIndex, 1);
    res.status(200).json({});
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});