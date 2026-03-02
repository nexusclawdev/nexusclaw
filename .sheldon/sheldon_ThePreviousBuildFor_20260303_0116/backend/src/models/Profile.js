module.exports = function(sequelize, DataTypes) {
  const Profile = sequelize.define('Profile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    institution: {
      type: DataTypes.STRING,
      allowNull: true
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    researchInterests: {
      type: DataTypes.JSON,
      allowNull: true
    },
    notificationSettings: {
      type: DataTypes.JSON,
      defaultValue: {
        email: true,
        inApp: true,
        weeklyDigest: true
      }
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC'
      }
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'profiles',
    paranoid: true
  });

  return Profile;
};

module.exports.initProfileModel = module.exports;