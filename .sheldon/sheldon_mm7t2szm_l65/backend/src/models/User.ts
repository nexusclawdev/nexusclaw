const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');

class User extends Model {
  static initModel(sequelize) {
    User.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM('user', 'admin', 'super_admin'),
        defaultValue: 'user'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    }, {
      tableName: 'users',
      sequelize,
      timestamps: true
    });
  }

  static async findByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async comparePassword(attempt) {
    return bcrypt.compare(attempt, this.password);
  }

  async toResponseObject() {
    const { password, ...user } = this.toJSON();
    return user;
  }
}

module.exports = { User };