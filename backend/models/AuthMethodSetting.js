import { SupabaseModel } from "./SupabaseModel.js";

class AuthMethodSetting extends SupabaseModel {
  static get tableName() {
    return "auth_method_settings";
  }

  static get primaryKey() {
    return "method";
  }

  /* This table uses 'method' (text) as PK, not UUID — skip _id→id mapping. */
  static get columnMap() {
    return {
      signupEnabled: "signup_enabled",
      loginEnabled: "login_enabled"
    };
  }
}

export default AuthMethodSetting;
