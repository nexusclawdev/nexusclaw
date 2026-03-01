const { Router } = require('express');
const { auth } = require('../middleware/auth');

const contractRoutes = Router();

contractRoutes.get('/', auth, (req, res) => {
    res.json([]);
});

module.exports = { contractRoutes };
