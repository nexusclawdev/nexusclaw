const { Router } = require('express');
const { Task } = require('../models/Task');
const authMiddleware = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
    try {
        const tasks = await Task.findAll();
        res.json(tasks);
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const task = await Task.create(req.body);
        res.status(201).json(task);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
