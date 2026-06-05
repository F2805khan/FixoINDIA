import bcrypt from "bcryptjs";
import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize.js";

class User extends Model {
  async matchPassword(enteredPassword) {
    if (!this.password) return false;
    return bcrypt.compare(enteredPassword, this.password);
  }
}

User.init(
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    },
    city: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    subscriptionStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "active" },
    role: {
      type: DataTypes.ENUM("user", "admin", "owner"),
      defaultValue: "user"
    },
    authProvider: {
      type: DataTypes.ENUM("password", "otp", "google"),
      defaultValue: "password"
    },
    googleId: { type: DataTypes.STRING, allowNull: true },
    otpCode: { type: DataTypes.STRING, allowNull: true },
    otpExpires: { type: DataTypes.DATE, allowNull: true }
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    hooks: {
      beforeSave: async (user) => {
        if (user.changed("password") && user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  }
);

export default User;
