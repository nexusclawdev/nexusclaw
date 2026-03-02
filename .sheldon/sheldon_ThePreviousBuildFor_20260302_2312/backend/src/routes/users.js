const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

// Lazy load models to avoid circular dependencies
const lazyLoadModel = (path) => {
  delete require.cache[require.resolve(path)];
  return require(path);
};

// Users CRUD routes
router.get('/', async (req, res, next) > {
  try {
    const User = lazyLoadModel('../models/User');
    const { page = 1, limit = 10, search } = req.query;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const users = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      users: users.rows,
      total: users.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(users.count / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) > {
  try {
    const User = lazyLoadModel('../models/User');
    const user = await User.findByPk(req.params.id, {
      include: [
        {
          model: lazyLoadModel('../models/Team'),
          as: 'team',
          attributes: [ 'id', 'name' ]
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) > {
  try {
    const User = lazyLoadModel('../models/User');
    
    const user = await User.create(req.body);
    
    if (req.body.teamId) {
      const Team = lazyLoadModel('../models/Team');
      const team = await Team.findByPk(req.body.teamId);
      if (team) {
        await user.setTeam(team);
      }
    }
    
    const createdUser = await User.findByPk(user.id, {
      include: [
        {
          model: lazyLoadModel('../models/Team'),
          as: 'team'
        }
      ]
    });
    
    res.status(201).json(createdUser);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) > {
  try {
    const User = lazyLoadModel('../models/User');
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.update(req.body);
    
    const updatedUser = await User.findByPk(user.id, {
      include: [
        {
          model: lazyLoadModel('../models/Team'),
          as: 'team'
        }
      ]
    });
    
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) > {
  try {
    const User = lazyLoadModel('../models/User');
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
