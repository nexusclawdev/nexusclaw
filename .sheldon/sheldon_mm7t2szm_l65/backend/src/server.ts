const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createConnection } = require('./database/index');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const { logger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
createConnection().then(() => {
  logger.info('Database connection established');
}).catch((error) => {
  logger.error('Database connection failed:', error);
  process.exit(1);
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// API Routes
app.use('/api/auth', (req, res, next) => {
  const { authRoutes } = require('./routes/auth');
  return authRoutes(req, res, next);
});

app.use('/api/documents', (req, res, next) => {
  const { documentRoutes } = require('./routes/documents');
  return documentRoutes(req, res, next);
});

app.use('/api/contracts', (req, res, next) => {
  const { contractRoutes } = require('./routes/contracts');
  return contractRoutes(req, res, next);
});

app.use('/api/users', (req, res, next) => {
  const { userRoutes } = require('./routes/users');
  return userRoutes(req, res, next);
});

app.use('/api/uploads', (req, res, next) => {
  const { uploadRoutes } = require('./routes/uploads');
  return uploadRoutes(req, res, next);
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;