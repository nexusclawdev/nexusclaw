const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    logger.error(`[ErrorHandler] ${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    if (err.stack) {
        logger.error(err.stack);
    }

    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
