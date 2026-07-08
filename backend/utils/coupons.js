import Coupon from "../models/Coupon.js";

export const normalizeCouponCode = (code) => String(code || "").trim().toUpperCase();

export const parseMoney = (value) => {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  return cleaned ? Number(cleaned) : NaN;
};

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const normalizeCouponPayload = (values = {}) => {
  const discountType = String(values.discountType || values.discount_type || "flat").toLowerCase();
  const discountValue = parseMoney(values.discountValue ?? values.discount_value);
  const minOrderAmount = parseMoney(values.minOrderAmount ?? values.minOrder ?? values.min_order_amount ?? 0);
  const rawMaxDiscount = values.maxDiscount ?? values.max_discount;
  const maxDiscount = rawMaxDiscount === "" || rawMaxDiscount === null || rawMaxDiscount === undefined
    ? null
    : parseMoney(rawMaxDiscount);
  const rawUsageLimit = values.usageLimit ?? values.usage_limit ?? 1;
  const usageLimit = rawUsageLimit === "" || rawUsageLimit === null || rawUsageLimit === undefined
    ? null
    : Number(rawUsageLimit);

  return {
    code: normalizeCouponCode(values.code),
    discountType,
    discountValue,
    minOrderAmount: Number.isFinite(minOrderAmount) ? minOrderAmount : 0,
    maxDiscount: Number.isFinite(maxDiscount) ? maxDiscount : null,
    usageLimit: Number.isFinite(usageLimit) ? Math.max(0, Math.floor(usageLimit)) : null,
    usedCount: Number.isFinite(Number(values.usedCount ?? values.used_count))
      ? Math.max(0, Math.floor(Number(values.usedCount ?? values.used_count)))
      : 0,
    isActive: values.isActive ?? values.enabled ?? values.is_active ?? true,
    expiresAt: values.expiresAt || values.expires_at || null
  };
};

export const assertCouponPayload = (coupon) => {
  if (!coupon.code) {
    const error = new Error("Coupon code is required");
    error.statusCode = 400;
    throw error;
  }

  if (!["flat", "percentage"].includes(coupon.discountType)) {
    const error = new Error("Coupon discount type must be flat or percentage");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(coupon.discountValue) || coupon.discountValue <= 0) {
    const error = new Error("Coupon discount value must be greater than 0");
    error.statusCode = 400;
    throw error;
  }

  if (coupon.discountType === "percentage" && coupon.discountValue > 100) {
    const error = new Error("Percentage coupons cannot be more than 100%");
    error.statusCode = 400;
    throw error;
  }

  if (coupon.maxDiscount !== null && (!Number.isFinite(coupon.maxDiscount) || coupon.maxDiscount < 0)) {
    const error = new Error("Maximum discount must be 0 or more");
    error.statusCode = 400;
    throw error;
  }

  if (coupon.usageLimit !== null && coupon.usageLimit < 0) {
    const error = new Error("Usage limit must be 0 or more");
    error.statusCode = 400;
    throw error;
  }
};

export const validateCouponForAmount = async (code, orderAmount) => {
  const normalizedCode = normalizeCouponCode(code);
  const subtotal = parseMoney(orderAmount);

  if (!normalizedCode) {
    const error = new Error("Coupon code is required");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    const error = new Error("A valid order amount is required");
    error.statusCode = 400;
    throw error;
  }

  const coupon = await Coupon.findOne({ where: { code: normalizedCode } });

  if (!coupon) {
    const error = new Error("Invalid coupon code");
    error.statusCode = 404;
    throw error;
  }

  if (coupon.isActive === false) {
    const error = new Error("Coupon is inactive");
    error.statusCode = 400;
    throw error;
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    const error = new Error("Coupon has expired");
    error.statusCode = 400;
    throw error;
  }

  const usageLimit = coupon.usageLimit === null || coupon.usageLimit === undefined ? null : Number(coupon.usageLimit);
  const usedCount = Number(coupon.usedCount) || 0;
  if (usageLimit !== null && usageLimit > 0 && usedCount >= usageLimit) {
    const error = new Error("Coupon usage limit reached");
    error.statusCode = 400;
    throw error;
  }

  const minOrderAmount = Number(coupon.minOrderAmount) || 0;
  if (subtotal < minOrderAmount) {
    const error = new Error(`Minimum order ₹${minOrderAmount} required for this coupon`);
    error.statusCode = 400;
    throw error;
  }

  let discountAmount = coupon.discountType === "percentage"
    ? (subtotal * Number(coupon.discountValue)) / 100
    : Number(coupon.discountValue);

  const maxDiscount = Number(coupon.maxDiscount) || 0;
  if (maxDiscount > 0) discountAmount = Math.min(discountAmount, maxDiscount);
  discountAmount = roundMoney(Math.min(discountAmount, subtotal));

  return {
    coupon,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    minOrderAmount,
    maxDiscount: coupon.maxDiscount === null || coupon.maxDiscount === undefined ? null : Number(coupon.maxDiscount),
    orderAmount: roundMoney(subtotal),
    discountAmount,
    finalAmount: roundMoney(Math.max(0, subtotal - discountAmount))
  };
};

export const incrementCouponUsage = async (coupon) => {
  if (!coupon) return null;
  coupon.usedCount = (Number(coupon.usedCount) || 0) + 1;
  await coupon.save();
  return coupon;
};
