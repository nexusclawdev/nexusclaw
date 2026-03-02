const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');

class User extends Model {
  static async initModel(sequelize, DataTypes) {
    return super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [8, 128]
        }
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      role: {
        type: DataTypes.ENUM(
          'user',
          'admin',
          'researcher'
        ),
        defaultValue: 'user'
allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      lastLoginAt: {
        type: DataTypes.DATE
      }
    }, {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      paranoid: true,
      indexes: [
        {
          fields: ['email'],
          unique: true
        },
        {
          fields: ['role'],
          name: 'idx_users_role'
        },
        {
          fields: ['isActive'],
          name: 'idx_users_active'
        }
      ]
    });
  }
  
  static associate(models) {
    this.hasOne(models.Profile, { 
      foreignKey: 'userId',
      as: 'profile',
      onDelete: 'CASCADE'
    });
    
    this.hasMany(models.Document, { 
      foreignKey: 'authorId',
      as: 'documents',
      onDelete: 'CASCADE'
    });
    
    this.hasMany(models.Annotation, { 
      foreignKey: 'annotatorId',
      as: 'annotations',
      onDelete: 'CASCADE'
    });
  }
  
  static async hashPassword(password) {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
  
  static async comparePassword(user, candidatePassword) {
    return bcrypt.compare(candidatePassword, user.password);
  }
  
  async comparePassword(candidatePassword) {
    return User.comparePassword(this, candidatePassword);
  }
  
  toJSON() {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
  }
}

module.exports = { User, initUserModel: User.initModel };