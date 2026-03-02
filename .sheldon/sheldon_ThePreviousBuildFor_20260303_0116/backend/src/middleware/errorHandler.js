const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error('Error occurred:', {
    error: err,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  const response = {
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      name: err.name
    })
  };
  
  res.status(statusCode).json(response);
};

module.exports = errorHandler;