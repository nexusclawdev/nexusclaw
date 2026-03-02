const express = require('express');
const router = express.Router();

// Lazy load routes to avoid circular dependencies
const lazyLoad = (path) => {
  delete require.cache[require.resolve(path)];
  return require(path);
};

// Import all route modules
const authRoutes = lazyLoad('./auth');
const documentRoutes = lazyLoad('./documents');
const userRoutes = lazyLoad('./users');
const teamRoutes = lazyLoad('./teams');

// Mount routes
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);

module.exports = router;
