const { Router } = require('express');
const { auth } = require('../middleware/auth');

const uploadRoutes = Router();

uploadRoutes.post('/', auth, (req, res) => {
    res.status(501).json({ message: 'Uploading is under repair' });
});

module.exports = { uploadRoutes };
