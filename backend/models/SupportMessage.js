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
    ticketId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    reply: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
    status: {
      type: DataTypes.ENUM("Pending", "Open", "Replied", "Complete", "Closed"),
      defaultValue: "Pending"
    }
  },
  {
    sequelize,
    modelName: "SupportMessage",
    tableName: "support_messages"
  }
);

export default SupportMessage;
