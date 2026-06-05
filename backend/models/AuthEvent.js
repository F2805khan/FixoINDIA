import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize.js";

class AuthEvent extends Model {}

AuthEvent.init(
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "_id" }
    },
    eventType: {
      type: DataTypes.ENUM("signup", "login", "password-reset"),
      allowNull: false
    },
    provider: {
      type: DataTypes.ENUM("password", "otp", "google"),
      allowNull: false
    },
    email: { type: DataTypes.STRING, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.STRING(500), allowNull: true }
  },
  {
    sequelize,
    modelName: "AuthEvent",
    tableName: "auth_events",
    updatedAt: false
  }
);

export default AuthEvent;
