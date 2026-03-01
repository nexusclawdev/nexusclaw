const sequelize = require('../db');
const User = require('./User');
const AiSession = require('./AiSession');
const File = require('./File');

const models = {
  User,
  AiSession,
  File
};

Object.values(models)
  .filter(model => model.associate)
  .forEach(model => model.associate(models));

module.exports = { sequelize, ...models };