import { SupabaseModel } from "./SupabaseModel.js";

class AuthEvent extends SupabaseModel {
  static get tableName() {
    return "auth_events";
  }

  static get columnMap() {
    return {
      userId: "user_id",
      eventType: "event_type",
      ipAddress: "ip_address",
      userAgent: "user_agent"
    };
  }
}

export default AuthEvent;
