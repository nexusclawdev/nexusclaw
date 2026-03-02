const { Model } = require('sequelize');

module.exports = { Task, initTaskModel };

function Task(sequelize, DataTypes) {
  class Task extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'assigneeId', as: 'assignee' });
      this.belongsTo(models.User, { foreignKey: 'authorId', as: 'author' });
    }
  }

  Task.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true, len: [1, 255] } },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('todo', 'in_progress', 'review', 'done'), defaultValue: 'todo', allowNull: false },
    priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium', allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    estimatedHours: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0, max: 240 } },
    actualHours: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0, max: 240 } },
    isBlocked: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    blockedReason: { type: DataTypes.TEXT, allowNull: true },
    tags: { type: DataTypes.JSON, allowNull: true, defaultValue: () => [] },
    attachments: { type: DataTypes.JSON, allowNull: true, defaultValue: () => [] },
  }, {
    sequelize,
    modelName: 'Task',
    tableName: 'tasks',
    paranoid: true,
  });

  return Task;
}

function initTaskModel(sequelize, DataTypes) {
  return Task(sequelize, DataTypes);
}