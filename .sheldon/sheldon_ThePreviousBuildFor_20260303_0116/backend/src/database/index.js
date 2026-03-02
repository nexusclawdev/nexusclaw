const { Sequelize } = require('sequelize');

let sequelize = null;

const models = {
  User: null,
  Profile: null,
  Document: null,
  ResearchPaper: null,
  Annotation: null,
  Project: null,
  Team: null,
  TeamMember: null,
  Citation: null,
  Task: null,
  QueueJob: null
};

async function createConnection() {
  if (sequelize) {
    return sequelize;
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  });

  // Initialize only existing models
  const User = require('../models/User');
  User.init(sequelize);
  models.User = User;

  // Sync database
  await sequelize.sync({ alter: true });

  return sequelize;
}

async function setupAssociations() {
  // User associations
  models.User.hasOne(models.Profile, { foreignKey: 'userId', onDelete: 'CASCADE' });
  models.Profile.belongsTo(models.User, { foreignKey: 'userId' });

  // Document associations
  models.Document.belongsTo(models.User, { foreignKey: 'ownerId', onDelete: 'CASCADE' });
  models.User.hasMany(models.Document, { foreignKey: 'ownerId' });
  models.Document.hasMany(models.Annotation, { foreignKey: 'documentId', onDelete: 'CASCADE' });
  models.Annotation.belongsTo(models.Document, { foreignKey: 'documentId' });

  // ResearchPaper associations
  models.ResearchPaper.belongsTo(models.User, { foreignKey: 'ownerId', onDelete: 'CASCADE' });
  models.User.hasMany(models.ResearchPaper, { foreignKey: 'ownerId' });
  models.ResearchPaper.hasMany(models.Citation, { foreignKey: 'paperId', onDelete: 'CASCADE' });
  models.Citation.belongsTo(models.ResearchPaper, { foreignKey: 'paperId' });

  // Project associations
  models.Project.belongsTo(models.User, { foreignKey: 'ownerId', onDelete: 'CASCADE' });
  models.User.hasMany(models.Project, { foreignKey: 'ownerId' });
  models.Project.belongsToMany(models.User, { through: models.TeamMember, foreignKey: 'projectId' });
  models.User.belongsToMany(models.Project, { through: models.TeamMember, foreignKey: 'userId' });
  models.Project.hasMany(models.Task, { foreignKey: 'projectId', onDelete: 'CASCADE' });
  models.Task.belongsTo(models.Project, { foreignKey: 'projectId' });

  // QueueJob associations
  models.QueueJob.belongsTo(models.User, { foreignKey: 'ownerId', onDelete: 'CASCADE' });
  models.User.hasMany(models.QueueJob, { foreignKey: 'ownerId' });
  models.QueueJob.belongsTo(models.Document, { foreignKey: 'documentId', onDelete: 'CASCADE' });
  models.Document.hasMany(models.QueueJob, { foreignKey: 'documentId' });
  models.QueueJob.belongsTo(models.ResearchPaper, { foreignKey: 'paperId', onDelete: 'CASCADE' });
  models.ResearchPaper.hasMany(models.QueueJob, { foreignKey: 'paperId' });
}

module.exports = {
  sequelize,
  models,
  createConnection,
  setupAssociations
};