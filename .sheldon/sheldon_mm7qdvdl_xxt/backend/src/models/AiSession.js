const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AiSession = sequelize.define('AiSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  response: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'gpt-4'
  },
  tokensUsed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'error'),
    defaultValue: 'active'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'ai_sessions',
  timestamps: true
});

AiSession.associate = function(models) {
  AiSession.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

module.exports = AiSession;