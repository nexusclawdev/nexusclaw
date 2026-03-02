const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Create sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../data/app.sqlite'),
  logging: false,
});

// Model registry — populated by createConnection
let User, Task, Profile;

async function createConnection() {
  try {
    await sequelize.authenticate();

    // Load model factories
    const userFactory = require('../models/User').User;
    const taskFactory = require('../models/Task').Task;
    const profileFactory = require('../models/Profile').Profile;

    // Initialize models
    User = userFactory(sequelize, DataTypes);
    Task = taskFactory(sequelize, DataTypes);
    Profile = profileFactory(sequelize, DataTypes);

    // Setup associations
    const models = { User, Task, Profile };
    [User, Task, Profile].forEach(m => { if (m && m.associate) m.associate(models); });

    // Sync tables
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully');
    return { sequelize, User, Task, Profile };
  } catch (err) {
    console.error('❌ Database sync failed:', err.message);
    throw err;
  }
}

module.exports = { sequelize, createConnection, getModels: () => ({ User, Task, Profile }) };