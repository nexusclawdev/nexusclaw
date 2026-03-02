const { Sequelize } = require('sequelize');
const path = require('path');

// Model factories
const initUserModel = require('../models/User');
const initProfileModel = require('../models/Profile');
const initResearchProjectModel = require('../models/ResearchProject');
const initDocumentModel = require('../models/Document');
const initCitationModel = require('../models/Citation');

let sequelize;

function createConnection() {
  if (!sequelize) {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, '../database.sqlite'),
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });

    // Initialize all models
    const User = initUserModel(sequelize, Sequelize.DataTypes);
    const Profile = initProfileModel(sequelize, Sequelize.DataTypes);
    const ResearchProject = initResearchProjectModel(sequelize, Sequelize.DataTypes);
    const Document = initDocumentModel(sequelize, Sequelize.DataTypes);
    const Citation = initCitationModel(sequelize, Sequelize.DataTypes);

    // Set up associations
    User.hasOne(Profile, { foreignKey: 'userId', as: 'profile' });
    Profile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    User.hasMany(ResearchProject, { foreignKey: 'ownerId', as: 'researchProjects' });
    ResearchProject.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

    ResearchProject.hasMany(Document, { foreignKey: 'researchProjectId', as: 'documents' });
    Document.belongsTo(ResearchProject, { foreignKey: 'researchProjectId', as: 'researchProject' });

    ResearchProject.hasMany(Citation, { foreignKey: 'researchProjectId', as: 'citations' });
    Citation.belongsTo(ResearchProject, { foreignKey: 'researchProjectId', as: 'researchProject' });

    Document.hasMany(Citation, { foreignKey: 'documentId', as: 'citations' });
    Citation.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

    // Sync database (for development)
    sequelize.sync({ alter: true });

    // Export models
    module.exports.User = User;
    module.exports.Profile = Profile;
    module.exports.ResearchProject = ResearchProject;
    module.exports.Document = Document;
    module.exports.Citation = Citation;
  }

  return sequelize;
}

module.exports = { sequelize, createConnection };