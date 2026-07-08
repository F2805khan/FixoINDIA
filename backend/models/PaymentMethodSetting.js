import { SupabaseModel } from "./SupabaseModel.js";

class PaymentMethodSetting extends SupabaseModel {
  static get tableName() {
    return "payment_method_settings";
  }

  static get primaryKey() {
    return "method";
  }

  /* This table uses 'method' (text) as PK, not UUID — skip _id→id mapping */
  static get columnMap() {
    return {};
  }
}

export default PaymentMethodSetting;
