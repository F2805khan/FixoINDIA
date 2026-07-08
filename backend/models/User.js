import bcrypt from "bcryptjs";
import { supabase } from "../config/supabase.js";
import { normalizeDbError } from "../utils/safeErrorMessage.js";
import { SupabaseModel } from "./SupabaseModel.js";

const isNameColumnError = (message = "") => /full_name|schema cache|could not find/i.test(String(message || ""));

const compact = (values = {}) =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));

class User extends SupabaseModel {
  static get tableName() {
    return "users";
  }

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

  static async syncNameColumns(userId, nameValue) {
    if (!userId || nameValue === undefined) return;

    for (const updates of [
      { full_name: nameValue, name: nameValue },
      { full_name: nameValue },
      { name: nameValue }
    ]) {
      const { error } = await supabase.from("users").update(updates).eq("id", userId);
      if (!error) return;
    }
  }

  static async syncProfileFields(userId, updates = {}) {
    if (!userId) return;

    const patch = compact({
      phone: updates.phone,
      email: updates.email,
      address: updates.address,
      city: updates.city,
      latitude: updates.latitude,
      longitude: updates.longitude,
      status: updates.subscriptionStatus,
      subscriptionStatus: updates.subscriptionStatus
    });

    if (updates.name !== undefined) {
      patch.full_name = updates.name;
      patch.name = updates.name;
    }

    if (!Object.keys(patch).length) return;

    let lastError = null;
    const attempts = [
      patch,
      compact({
        full_name: updates.name,
        phone: updates.phone,
        email: updates.email,
        address: updates.address,
        city: updates.city,
        latitude: updates.latitude,
        longitude: updates.longitude,
        status: updates.subscriptionStatus
      }),
      compact({
        name: updates.name,
        phone: updates.phone,
        email: updates.email,
        address: updates.address,
        city: updates.city,
        latitude: updates.latitude,
        longitude: updates.longitude,
        subscriptionStatus: updates.subscriptionStatus
      })
    ].filter((entry) => Object.keys(entry).length);

    for (const payload of attempts) {
      const { error } = await supabase.from("users").update(payload).eq("id", userId);
      if (!error) return;
      lastError = error;
    }

    if (lastError) {
      throw normalizeDbError(lastError, { action: "profile" });
    }
  }

  static async persistProfileUpdates(user, updates = {}) {
    if (!user?._id) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const payload = compact(updates);
    if (!Object.keys(payload).length) return user;

    for (const [key, value] of Object.entries(payload)) {
      user[key] = value;
    }

    let modelUpdated = false;

    try {
      await user.update(payload);
      modelUpdated = true;
    } catch (error) {
      console.warn("Model profile update fallback:", error?.message || error);
    }

    try {
      await this.syncProfileFields(user._id, payload);
    } catch (error) {
      if (!modelUpdated) throw error;
    }

    if (payload.name !== undefined) {
      await this.syncNameColumns(user._id, payload.name);
    }

    try {
      await user.reload();
    } catch {
      /* Direct sync above still saved profile fields */
    }

    for (const [key, value] of Object.entries(payload)) {
      user[key] = value;
    }

    return user;
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

    try {
      return await super.create(data);
    } catch (error) {
      const raw = error?.internalMessage || error?.message || "";
      if (!isNameColumnError(raw) || data.name === undefined) throw normalizeDbError(error, { action: "profile" });

      const { data: created, error: insertError } = await supabase
        .from("users")
        .insert([{ name: data.name, email: data.email, phone: data.phone }])
        .select()
        .single();

      if (insertError) throw normalizeDbError(insertError, { action: "profile" });
      return new this({ ...data, _id: created.id, name: created.name ?? data.name });
    }
  }

  async save() {
    if (this.password && !this.password.startsWith("$2a$") && !this.password.startsWith("$2b$")) {
      this.password = await User.hashPassword(this.password);
    }

    try {
      await super.save();
    } catch (error) {
      const raw = error?.internalMessage || error?.message || "";
      if (!this._id || this.name === undefined || !isNameColumnError(raw)) {
        throw normalizeDbError(error, { action: "profile" });
      }

      await User.syncNameColumns(this._id, this.name);
      await this.reload();
      return this;
    }

    if (this.name !== undefined && this._id) {
      await User.syncNameColumns(this._id, this.name);
      try {
        await this.reload();
      } catch {
        /* Keep saved instance if reload fails */
      }
    }

    return this;
  }
}

export default User;
