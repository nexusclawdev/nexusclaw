const { Sequelize, DataTypes, Model } = require('sequelize');
const fs = require('fs');
const path = require('path');

let sequelize;

async function createConnection() {
  if (!sequelize) {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite',
      logging: console.log,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
  
  return sequelize;
}

async function initModels() {
  const sequelize = await createConnection();
  
  // Import models
  const models = {};
  
  // Dynamically import all models from models directory
  const modelFiles = fs.readdirSync(__dirname + '/../models');
  modelFiles.forEach(file => {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      const model = require(path.join(__dirname, '..', 'models', file));
      if (model.default) {
        models[model.default.name] = model.default;
      } else if (model[Object.keys(model)[0]]) {
        Object.keys(model).forEach(key => {
          models[key] = model[key];
        });
      }
    }
  });
  
  // Define models
  const { User, Profile, Document, Annotation, Tag, DocumentTag } = require('./models');
  
  // Initialize models
  await User.initModel(sequelize, DataTypes);
  await Profile.initModel(sequelize, DataTypes);
  await Document.initModel(sequelize, DataTypes);
  await Annotation.initModel(sequelize, DataTypes);
  await Tag.initModel(sequelize, DataTypes);
  await DocumentTag.initModel(sequelize, DataTypes);
  
  // Register models
  models.User = User;
  models.Profile = Profile;
  models.Document = Document;
  models.Annotation = Annotation;
  models.Tag = Tag;
  models.DocumentTag = DocumentTag;
  
  // Define associations
  User.hasOne(Profile, { foreignKey: 'userId', as: 'profile' });
  Profile.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  
  User.hasMany(Document, { foreignKey: 'authorId', as: 'documents' });
  Document.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
  
  Document.hasMany(Annotation, { foreignKey: 'documentId', as: 'annotations' });
  Annotation.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });
  
  Annotation.belongsTo(User, { foreignKey: 'annotatorId', as: 'annotator' });
  User.hasMany(Annotation, { foreignKey: 'annotatorId', as: 'annotations' });
  
  Tag.belongsToMany(Document, { through: DocumentTag, foreignKey: 'tagId' });
  Document.belongsToMany(Tag, { through: DocumentTag, foreignKey: 'documentId' });
  
  return models;
}

async function syncDatabase() {
  const sequelize = await createConnection();
  await sequelize.sync({ alter: true });
}

module.exports = {
  createConnection,
  initModels,
  syncDatabase
};