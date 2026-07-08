import { SupabaseModel } from "./SupabaseModel.js";

class Coupon extends SupabaseModel {
  static get tableName() {
    return "coupons";
  }

  static get columnMap() {
    return {
      discountType: "discount_type",
      discountValue: "discount_value",
      minOrderAmount: "min_order_amount",
      maxDiscount: "max_discount",
      usageLimit: "usage_limit",
      usedCount: "used_count",
      isActive: "is_active",
      expiresAt: "expires_at"
    };
  }
}

export default Coupon;
