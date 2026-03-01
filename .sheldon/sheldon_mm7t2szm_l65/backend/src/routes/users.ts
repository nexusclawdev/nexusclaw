const { Router } = require('express');
const { auth } = require('../middleware/auth');

const userRoutes = Router();

userRoutes.get('/profile', auth, (req, res) => {
    res.json(req.user);
});

module.exports = { userRoutes };
