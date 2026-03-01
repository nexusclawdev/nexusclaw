const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { Document } = require('../models/Document');
const { logger } = require('../utils/logger');

const documentRoutes = Router();

documentRoutes.get('/', auth, async (req, res, next) => {
    try {
        const documents = await Document.findByUserId(req.user.userId);
        res.json(documents);
    } catch (error) {
        next(error);
    }
});

documentRoutes.get('/:id', auth, async (req, res, next) => {
    try {
        const document = await Document.findById(parseInt(req.params.id));
        if (!document || document.userId !== req.user.userId) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.json(document);
    } catch (error) {
        next(error);
    }
});

documentRoutes.post('/upload', auth, (req, res) => {
    res.status(501).json({ message: 'Upload functionality being repaired' });
});

module.exports = { documentRoutes };
