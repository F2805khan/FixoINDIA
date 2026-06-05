import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize.js";

class Payment extends Model {}

Payment.init(
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    bookingId: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DOUBLE, allowNull: false },
    method: {
      type: DataTypes.ENUM("UPI", "Debit/Credit Card", "Net Banking", "Cash on Service", "Wallet"),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("Created", "Paid", "Failed", "Refunded"),
      defaultValue: "Created"
    },
    transactionId: { type: DataTypes.STRING, allowNull: true, unique: true },
    gatewayOrderId: { type: DataTypes.STRING, allowNull: true }
  },
  {
    sequelize,
    modelName: "Payment",
    tableName: "payments"
  }
);

export default Payment;
