import { SupabaseModel } from "./SupabaseModel.js";

class SupportMessage extends SupabaseModel {
  static get tableName() {
    return "support_messages";
  }
}

export default SupportMessage;
