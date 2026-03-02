const crypto = require('crypto');

/**
 * Generate a cryptographically secure random ID
 * @param {number} [length=16] - Length of the ID
 * @returns {string} Random ID
 */
function generateId(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Format date to ISO 8601 string
 * @param {Date} [date=new Date()] - Date to format
 * @returns {string} ISO 8601 formatted date
 */
function formatDate(date = new Date()) {
  return date.toISOString();
}

/**
 * Sanitize input to prevent XSS and SQL injection
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Hash sensitive data (e.g., PII) using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} SHA-256 hash
 */
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Calculate pagination parameters
 * @param {number} page - Current page number (1-based)
 * @param {number} limit - Items per page
 * @param {number} total - Total items available
 * @returns {object} Pagination object with offset, limit, totalPages
 */
function calculatePagination(page = 1, limit = 10, total) {
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);
  
  return {
    offset,
    limit,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Extract and validate pagination query parameters
 * @param {object} query - Query parameters object
 * @returns {object} Validated pagination parameters
 */
function parsePagination(query) {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 10, 100); // Max 100 items per page
  
  return {
    page: page > 0 ? page : 1,
    limit: limit > 0 ? limit : 10
  };
}

/**
 * Format error response with consistent structure
 * @param {Error} error - Error object
 * @param {number} [statusCode=500] - HTTP status code
 * @returns {object} Formatted error response
 */
function formatError(error, statusCode = 500) {
  return {
    error: error.message || 'Internal Server Error',
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
}

module.exports = {
  generateId,
  formatDate,
  sanitizeInput,
  isValidEmail,
  hashData,
  calculatePagination,
  parsePagination,
  formatError
};