const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    // LAZY require for User model to avoid circular dependencies
    const { User } = require('../models');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    User.findByPk(decoded.userId)
      .then(user => {
        if (!user) {
          return res.status(401).json({ error: 'Invalid token: user not found' });
        }
        
        req.user = user;
        next();
      })
      .catch(err => {
        return res.status(401).json({ error: 'Invalid token: user not found' });
      });
    
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;