const { DataTypes, Model } = require('sequelize');

class Contract extends Model {
  static initModel(sequelize) {
    Contract.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      documentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      contractType: {
        type: DataTypes.ENUM('employment', 'nda', 'lease', 'service', 'sales', 'partnership', 'other'),
        allowNull: false
      },
      partyA: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      partyB: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      effectiveDate: {
        type: DataTypes.DATE,
        allowNull: false
      },
      expirationDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      riskScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      riskLevel: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'low'
      },
      keyTerms: {
        type: DataTypes.JSON,
        allowNull: true
      }
    }, {
      tableName: 'contracts',
      sequelize,
      timestamps: true
    });
  }

  static async findByDocumentId(documentId) {
    return await Contract.findOne({ where: { documentId } });
  }

  async toResponseObject() {
    const { documentId, ...contract } = this.toJSON();
    return contract;
  }
}

module.exports = { Contract };