import { Op } from "../utils/sequelizeMock.js";
import asyncHandler from "../middleware/asyncHandler.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import { assertPaymentMethodEnabled, getPaymentMethodSettings } from "../utils/paymentMethods.js";

const paymentStatuses = ["Created", "Paid", "Failed", "Refunded"];

const parseAmount = (value) => {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  return cleaned ? Number(cleaned) : NaN;
};

const paymentLookupWhere = ({ bookingId, gatewayOrderId }) => {
  const parts = [];
  if (bookingId) parts.push({ bookingId });
  if (gatewayOrderId) parts.push({ gatewayOrderId });
  return parts.length === 1 ? parts[0] : { [Op.or]: parts };
};

export const createOrder = asyncHandler(async (req, res) => {
  const { bookingId, amount, method } = req.body;
  const parsedAmount = parseAmount(amount);

  if (!bookingId || !method || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    res.status(400);
    throw new Error("Booking ID, valid amount, and payment method are required");
  }

  await assertPaymentMethodEnabled(method);

  const gatewayOrderId = `order_QF_${Date.now()}`;
  const payment = await Payment.create({
    bookingId,
    amount: parsedAmount,
    method,
    gatewayOrderId,
    status: "Created"
  });

  res.status(201).json({
    payment,
    gateway: "dummy-razorpay",
    order: {
      id: gatewayOrderId,
      amount: parsedAmount,
      currency: "INR",
      receipt: bookingId
    }
  });
});

export const getAvailablePaymentMethods = asyncHandler(async (req, res) => {
  res.json(await getPaymentMethodSettings({ enabledOnly: false }));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { bookingId, gatewayOrderId, transactionId, status = "Paid" } = req.body;

  if (!bookingId && !gatewayOrderId) {
    res.status(400);
    throw new Error("Booking ID or gateway order ID is required");
  }

  if (!paymentStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid payment status");
  }

  const payment = await Payment.findOne({
    where: paymentLookupWhere({ bookingId, gatewayOrderId })
  });

  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  payment.status = status;
  payment.transactionId = transactionId || `txn_${Date.now()}`;
  await payment.save();

  if (status === "Paid") {
    await Booking.update({ paymentStatus: "Paid" }, { where: { bookingId: payment.bookingId } });
  } else if (["Failed", "Refunded"].includes(status)) {
    await Booking.update({ paymentStatus: status }, { where: { bookingId: payment.bookingId } });
  }

  res.json({ message: "Payment verified", payment });
});

export const getPaymentByBookingId = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ where: { bookingId: req.params.bookingId } });

  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  res.json(payment);
});
