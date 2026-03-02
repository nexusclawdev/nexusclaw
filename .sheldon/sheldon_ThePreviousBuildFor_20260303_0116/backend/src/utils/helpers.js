const { v4: uuidv4 } = require('uuid');
const { format, parseISO } = require('date-fns');
const { sanitize } = require('sanitize-html');

module.exports = {
  /**
   * Generate a UUID v4
   */
  generateId: () => uuidv4(),

  /**
   * Format date to YYYY-MM-DD HH:mm:ss
   */
  formatDate: (date = new Date(), formatStr = 'yyyy-MM-dd HH:mm:ss') => 
    format(date, formatStr),

  /**
   * Parse ISO date string to Date object
   */
  parseDate: (isoString) => parseISO(isoString),

  /**
   * Sanitize user input to prevent XSS
   */
  sanitizeInput: (input) => sanitize(input, {
    allowedTags: [],
    allowedAttributes: {}
  }),

  /**
   * Validate email format
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special)
   */
  validatePassword: (password) => {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
    return true;
  },

  /**
   * Trim and sanitize object properties
   */
  sanitizeObject: (obj) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = module.exports.sanitizeInput(value.trim());
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  },

  /**
   * Check if value is empty (null, undefined, empty string/array/object)
   */
  isEmpty: (value) => {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    if (typeof value === 'string' && value.trim().length === 0) return true;
    return false;
  },

  /**
   * Generate random token (e.g., for email verification)
   */
  generateToken: (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Get pagination values with defaults
   */
  getPagination: (page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    return { limit: parseInt(limit), offset: parseInt(offset) };
  },

  /**
   * Check if user has admin role
   */
  isAdmin: (user) => user?.role === 'admin',

  /**
   * Check if user owns a resource (by id)
   */
  isOwner: (user, resource, userIdField = 'userId') => {
    return user?.id === resource[userIdField];
  }
};