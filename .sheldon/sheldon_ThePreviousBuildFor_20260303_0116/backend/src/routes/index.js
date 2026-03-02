const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const tasksRoutes = require('./tasks');
const documentsRoutes = require('./documents');

// Mount routes with base paths
router.use('/auth', authRoutes);
router.use('/tasks', tasksRoutes);
router.use('/documents', documentsRoutes);

module.exports = router;