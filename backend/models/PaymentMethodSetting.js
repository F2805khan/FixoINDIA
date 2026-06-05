import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize.js";

class PaymentMethodSetting extends Model {}

PaymentMethodSetting.init(
  {
    method: {
      type: DataTypes.ENUM("UPI", "Debit/Credit Card", "Net Banking", "Cash on Service", "Wallet"),
      primaryKey: true
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    sequelize,
    modelName: "PaymentMethodSetting",
    tableName: "payment_method_settings"
  }
);

export default PaymentMethodSetting;
