import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize.js";

class BeautyArtist extends Model {}

BeautyArtist.init(
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    specialty: { type: DataTypes.STRING, defaultValue: "Beauty Artist" },
    salonName: { type: DataTypes.STRING, defaultValue: "" },
    region: { type: DataTypes.STRING, defaultValue: "All Regions" },
    phone: { type: DataTypes.STRING, defaultValue: "" },
    email: { type: DataTypes.STRING, defaultValue: "" },
    image: { type: DataTypes.STRING, defaultValue: "/images/site/expert-riya.jpg" },
    bio: { type: DataTypes.TEXT, defaultValue: "" },
    rating: { type: DataTypes.FLOAT, defaultValue: 4.8 },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    services: { type: DataTypes.JSON, allowNull: true },
    videoTitle: { type: DataTypes.STRING, defaultValue: "" },
    videoUrl: { type: DataTypes.TEXT, allowNull: true },
    videoThumbnail: { type: DataTypes.STRING, defaultValue: "" }
  },
  {
    sequelize,
    modelName: "BeautyArtist",
    tableName: "beauty_artists"
  }
);

export default BeautyArtist;
