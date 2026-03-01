const { Sequelize } = require('sequelize');
const { User } = require('../models/User');
const { Document } = require('../models/Document');
const { Contract } = require('../models/Contract');
const { logger } = require('../utils/logger');

let database = null;

const createConnection = async () => {
  if (database) return database;

  const databaseType = process.env.DATABASE_TYPE || 'sqlite';
  const databaseFile = process.env.DATABASE_FILE || './data/database.sqlite';
  const databaseHost = process.env.DATABASE_HOST || 'localhost';
  const databasePort = parseInt(process.env.DATABASE_PORT || '5432');
  const databaseName = process.env.DATABASE_NAME || 'legal_ai';
  const databaseUser = process.env.DATABASE_USER || 'legal_ai_user';
  const databasePassword = process.env.DATABASE_PASSWORD || 'password';

  let sequelize;

  if (databaseType === 'sqlite') {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: databaseFile,
      logging: (msg) => logger.debug(msg)
    });
  } else {
    sequelize = new Sequelize(databaseName, databaseUser, databasePassword, {
      host: databaseHost,
      port: databasePort,
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg)
    });
  }

  // Define models
  User.initModel(sequelize);
  Document.initModel(sequelize);
  Contract.initModel(sequelize);

  // Sync database
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    logger.info('Database models synced successfully');
  } catch (error) {
    logger.error('Database sync failed:', error);
    throw error;
  }

  database = {
    sequelize,
    User,
    Document,
    Contract
  };

  return database;
};

const getDatabase = () => {
  if (!database) {
    throw new Error('Database not initialized');
  }
  return database;
};

module.exports = { createConnection, getDatabase };