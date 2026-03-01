const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'No authentication token, access denied' });
    }
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'supersecretkey'
        );
        req.user = decoded;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        res.status(401).json({ message: 'Token is invalid' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied: Admin role required' });
    }
    next();
};

module.exports = { auth, adminOnly };
