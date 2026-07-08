import asyncHandler from "../middleware/asyncHandler.js";
import Coupon from "../models/Coupon.js";
import {
  assertCouponPayload,
  normalizeCouponPayload,
  validateCouponForAmount
} from "../utils/coupons.js";

const findCoupon = async (id) => Coupon.findByPk(id);

export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.findAll({ order: [["createdAt", "DESC"]] });
  res.json(coupons);
});

export const createCoupon = asyncHandler(async (req, res) => {
  const payload = normalizeCouponPayload(req.body);
  assertCouponPayload(payload);

  const coupon = await Coupon.create(payload);
  res.status(201).json(coupon);
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await findCoupon(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  const payload = normalizeCouponPayload({ ...coupon.toJSON(), ...req.body });
  assertCouponPayload(payload);

  await coupon.update(payload);
  res.json(coupon);
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await findCoupon(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  await coupon.destroy();
  res.json({ message: "Coupon deleted successfully" });
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const result = await validateCouponForAmount(req.body.code, req.body.orderAmount ?? req.body.amount);
  const { coupon, ...summary } = result;
  res.json(summary);
});
