require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('../middleware/errorHandler');
const { rateLimiter } = require('../middleware/rateLimiter');
const { authMiddleware } = require('../middleware/auth');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
app.use(rateLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize database
const { sequelize } = require('../database');

// Middleware for all routes
app.use((req, res, next) => {
  req.context = {
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress
  };
  next();
});

// Authentication middleware for protected routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api', authMiddleware, require('../routes/documents'));
app.use('/api', authMiddleware, require('../routes/users'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (MUST be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;