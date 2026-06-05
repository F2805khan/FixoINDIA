import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize.js";

class Service extends Model {}

Service.init(
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.DOUBLE, allowNull: false },
    duration: { type: DataTypes.STRING, defaultValue: "30 Min" },
    image: { type: DataTypes.STRING, allowNull: false },
    rating: { type: DataTypes.FLOAT, defaultValue: 4.8 },
    region: { type: DataTypes.STRING, defaultValue: "All Regions" },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true }
  },
  {
    sequelize,
    modelName: "Service",
    tableName: "services"
  }
);

export default Service;
