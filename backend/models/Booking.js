import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize.js";

export const bookingStatuses = [
  "Confirmed",
  "Professional Assigned",
  "On The Way",
  "Service In Progress",
  "Completed",
  "Cancelled"
];

class Booking extends Model {}

Booking.init(
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
    serviceId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "services", key: "_id" }
    },
    bookingId: { type: DataTypes.STRING, allowNull: false, unique: true },
    serviceName: { type: DataTypes.STRING, allowNull: false },
    salonName: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    customerName: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    time: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DOUBLE, allowNull: false },
    paymentMethod: {
      type: DataTypes.ENUM("UPI", "Debit/Credit Card", "Net Banking", "Cash on Service", "Wallet"),
      defaultValue: "UPI"
    },
    paymentStatus: {
      type: DataTypes.ENUM("Pending", "Paid", "Failed", "Refunded"),
      defaultValue: "Pending"
    },
    bookingStatus: {
      type: DataTypes.ENUM(...bookingStatuses),
      defaultValue: "Confirmed"
    },
    professionalName: { type: DataTypes.STRING, defaultValue: "Ramesh Kumar" },
    professionalPhoto: {
      type: DataTypes.STRING,
      defaultValue:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=180&q=80"
    },
    estimatedArrival: { type: DataTypes.STRING, defaultValue: "12 minutes" }
  },
  {
    sequelize,
    modelName: "Booking",
    tableName: "bookings"
  }
);

export default Booking;
