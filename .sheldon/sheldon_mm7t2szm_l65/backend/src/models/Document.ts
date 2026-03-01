const { DataTypes, Model } = require('sequelize');

class Document extends Model {
  static initModel(sequelize) {
    Document.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      documentType: {
        type: DataTypes.ENUM('contract', 'agreement', 'memo', 'brief', 'other'),
        defaultValue: 'other'
      },
      status: {
        type: DataTypes.ENUM('uploaded', 'processing', 'processed', 'error'),
        defaultValue: 'uploaded'
      },
      originalFileName: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      storedFileName: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      fileType: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      pageCount: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    }, {
      tableName: 'documents',
      sequelize,
      timestamps: true
    });
  }

  static async findByUserId(userId) {
    return await Document.findAll({ where: { userId } });
  }

  static async findById(id) {
    return await Document.findOne({ where: { id } });
  }

  async toResponseObject() {
    const { userId, ...document } = this.toJSON();
    return document;
  }
}

module.exports = { Document };