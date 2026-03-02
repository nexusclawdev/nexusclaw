const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

// Lazy load models to avoid circular dependencies
const lazyLoadModel = (path) => {
  delete require.cache[require.resolve(path)];
  return require(path);
};

// Documents CRUD routes
router.get('/', async (req, res, next) > {
  try {
    const Document = lazyLoadModel('../models/Document');
    const { page = 1, limit = 10, search } = req.query;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const documents = await Document.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: lazyLoadModel('../models/User'),
          as: 'author',
          attributes: [ 'id', 'firstName', 'lastName' ]
        },
        {
          model: lazyLoadModel('../models/Team'),
          as: 'team',
          attributes: [ 'id', 'name' ]
        }
      ]
    });
    
    res.json({
      documents: documents.rows,
      total: documents.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(documents.count / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) > {
  try {
    const Document = lazyLoadModel('../models/Document');
    const document = await Document.findByPk(req.params.id, {
      include: [
        {
          model: lazyLoadModel('../models/User'),
          as: 'author'
        },
        {
          model: lazyLoadModel('../models/Team'),
          as: 'team'
        },
        {
          model: lazyLoadModel('../models/Document'),
          as: 'citations',
          through: { attributes: [] }
        }
      ]
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) > {
  try {
    const Document = lazyLoadModel('../models/Document');
    const User = lazyLoadModel('../models/User');
    
    const document = await Document.create({
      ...req.body,
      authorId: req.user?.id || req.body.authorId
    });
    
    if (req.body.teamId) {
      const team = await User.findByPk(req.body.teamId);
      if (team) {
        await document.setTeam(team);
      }
    }
    
    const createdDocument = await Document.findByPk(document.id, {
      include: [
        { model: User, as: 'author' },
        { model: lazyLoadModel('../models/Team'), as: 'team' }
      ]
    });
    
    res.status(201).json(createdDocument);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) > {
  try {
    const Document = lazyLoadModel('../models/Document');
    const document = await Document.findByPk(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    await document.update(req.body);
    
    const updatedDocument = await Document.findByPk(document.id, {
      include: [
        {
          model: lazyLoadModel('../models/User'),
          as: 'author'
        },
        {
          model: lazyLoadModel('../models/Team'),
          as: 'team'
        }
      ]
    });
    
    res.json(updatedDocument);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) > {
  try {
    const Document = lazyLoadModel('../models/Document');
    const document = await Document.findByPk(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    await document.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
