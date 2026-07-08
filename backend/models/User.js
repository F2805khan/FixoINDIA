import bcrypt from "bcryptjs";
import { SupabaseModel } from "./SupabaseModel.js";

class User extends SupabaseModel {
  static get tableName() {
    return "users";
  }

  /**
   * Map app-code column names → original DB column names.
   * The users table was created with snake_case columns originally.
   * Our migration added camelCase duplicates, but the originals
   * have NOT NULL constraints and existing data — so we map to them.
   */
  static get columnMap() {
    return {
      name: "full_name",
      userId: "username",
      authProvider: "provider",
      googleId: "firebase_uid",
      otpCode: "otp",
      otpExpires: "otp_expiry",
      subscriptionStatus: "status"
    };
  }

  async matchPassword(enteredPassword) {
    if (!this.password) return false;
    return bcrypt.compare(enteredPassword, this.password);
  }

  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async create(data) {
    if (data.password) {
      data.password = await this.hashPassword(data.password);
    }
    return super.create(data);
  }

  async save() {
    if (this.password && !this.password.startsWith("$2a$") && !this.password.startsWith("$2b$")) {
      this.password = await User.hashPassword(this.password);
    }
    return super.save();
  }
}

export default User;
