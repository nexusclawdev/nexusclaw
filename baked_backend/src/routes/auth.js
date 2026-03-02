const { Router } = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = Router();

router.post('/register', async (req, res, next) => {
    try {
        const { User } = require('../models/User');
        const { email, password, firstName, lastName } = req.body;
        const user = await User.create({ email, password, firstName, lastName });
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret');
        res.status(201).json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
        next(err);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { User } = require('../models/User');
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret');
        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
