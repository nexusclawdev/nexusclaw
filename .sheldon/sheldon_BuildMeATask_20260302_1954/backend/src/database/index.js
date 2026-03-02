const { Sequelize, DataTypes } = require('sequelize');
const { User, initUserModel } = require('../models/User');
const { Task, initTaskModel } = require('../models/Task');
const { Profile, initProfileModel } = require('../models/Profile');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './data/app.sqlite',
  logging: false,
});

async function createConnection() {
  try {
    await sequelize.authenticate();

    // Initialize models
    initUserModel(sequelize, DataTypes);
    initTaskModel(sequelize, DataTypes);
    initProfileModel(sequelize, DataTypes);

    // Setup associations
    const models = { User, Task, Profile };
    Object.values(models).forEach(model => {
      if (model.associate) model.associate(models);
    });

    // Sync models with database
    await sequelize.sync({ alter: true });

    console.log('Database synced successfully');
    return sequelize;
  } catch (err) {
    console.error('Database sync failed:', err);
    throw err;
  }
}

module.exports = { sequelize, createConnection };