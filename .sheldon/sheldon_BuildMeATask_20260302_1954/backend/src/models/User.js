const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = { User, initUserModel };

function User(sequelize, DataTypes) {
  class User extends Model {
    static associate(models) {
      this.hasOne(models.Profile, {
        foreignKey: 'userId',
        as: 'profile'
      });
      this.hasMany(models.Task, {
        foreignKey: 'assignedTo',
        as: 'assignedTasks'
      });
    }

    async comparePassword(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
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
      type: DataTypes.ENUM('user', 'admin', 'manager'),
      allowNull: false,
      defaultValue: 'user'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        fields: ['email'],
        unique: true
      },
      {
        fields: ['role']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  User.beforeCreate(async (user, options) => {
    if (user.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  User.beforeUpdate(async (user, options) => {
    if (user.password && options.fields.includes('password')) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  return User;
}