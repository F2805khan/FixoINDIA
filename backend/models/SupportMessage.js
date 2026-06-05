import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize.js";

class SupportMessage extends Model {}

SupportMessage.init(
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "_id" }
    },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    reply: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
    status: {
      type: DataTypes.ENUM("Open", "Replied", "Closed"),
      defaultValue: "Open"
    }
  },
  {
    sequelize,
    modelName: "SupportMessage",
    tableName: "support_messages"
  }
);

export default SupportMessage;
