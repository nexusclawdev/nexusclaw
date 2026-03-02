const { DataTypes, Model } = require('sequelize');

module.exports = { Profile, initProfileModel };

function Profile(sequelize, DataTypes) {
    class Profile extends Model {
        static associate(models) {
            this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        }
    }

    Profile.init({
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        bio: { type: DataTypes.TEXT },
        avatar: { type: DataTypes.STRING },
    }, { sequelize, modelName: 'Profile', tableName: 'profiles', timestamps: true });

    return Profile;
}
