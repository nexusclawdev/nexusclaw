const jwt = require('jsonwebtoken');
const { User } = require('./models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { userId } = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;