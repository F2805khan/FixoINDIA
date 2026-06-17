import asyncHandler from "../middleware/asyncHandler.js";
import { isPrivileged } from "../middleware/authMiddleware.js";
import Booking, { bookingStatuses } from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Service from "../models/Service.js";
import generateBookingId from "../utils/generateBookingId.js";
import { notifyWhatsAppAgent } from "../utils/whatsappAgent.js";
import { assertPaymentMethodEnabled } from "../utils/paymentMethods.js";
import { updateAcceptedBookingsCSV } from "../utils/excelExporter.js";


const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const paymentStatuses = ["Pending", "Paid", "Failed", "Refunded"];

const parseAmount = (value) => {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  return cleaned ? Number(cleaned) : NaN;
};

const findBooking = async (id) => {
  if (UUID_RE.test(id)) {
    const byPk = await Booking.findByPk(id);
    if (byPk) return byPk;
  }
  return Booking.findOne({ where: { bookingId: id } });
};

const assertBookingAccess = (req, booking) => {
  if (isPrivileged(req.user)) return;
  if (booking.userId.toString() === req.user._id.toString()) return;

  const error = new Error("You do not have access to this booking");
  error.statusCode = 403;
  throw error;
};

export const createBooking = asyncHandler(async (req, res) => {
  const service =
    req.body.serviceId && UUID_RE.test(String(req.body.serviceId))
      ? await Service.findByPk(req.body.serviceId)
      : null;
  const amount = parseAmount(req.body.amount ?? service?.price);
  const paymentMethod = req.body.paymentMethod || "UPI";
  const paymentStatus = req.body.paymentStatus || "Pending";
  const serviceName = req.body.serviceName || service?.title;
  const customerName = req.body.customerName || req.user.name;
  const phone = req.body.phone || req.user.phone;

  if (!serviceName || !customerName || !phone || !req.body.address || !req.body.date || !req.body.time) {
    res.status(400);
    throw new Error("Service, customer name, phone, address, date, and time are required");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400);
    throw new Error("A valid booking amount is required");
  }

  await assertPaymentMethodEnabled(paymentMethod);

  if (!paymentStatuses.includes(paymentStatus)) {
    res.status(400);
    throw new Error("Invalid payment status");
  }

  const booking = await Booking.create({
    userId: req.user._id,
    serviceId: service?._id ?? null,
    bookingId: req.body.bookingId || generateBookingId(),
    serviceName,
    salonName: req.body.salonName || "",
    customerName,
    phone,
    address: req.body.address,
    date: req.body.date,
    time: req.body.time,
    amount,
    paymentMethod,
    paymentStatus,
    bookingStatus: "Confirmed",
    professionalName: req.body.professionalName || "Ramesh Kumar",
    professionalPhoto: req.body.professionalPhoto,
    estimatedArrival: req.body.estimatedArrival || "12 minutes"
  });

  if (booking.paymentStatus === "Paid") {
    await Payment.create({
      bookingId: booking.bookingId,
      amount: booking.amount,
      method: booking.paymentMethod,
      status: "Paid",
      transactionId: `txn_${Date.now()}`
    });
  }

  let whatsappAgent;
  try {
    whatsappAgent = await notifyWhatsAppAgent(booking);
  } catch (error) {
    whatsappAgent = { sent: false, error: error.message };
  }

  res.status(201).json({ booking, whatsappAgent });
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.findAll({
    where: { userId: req.user._id },
    order: [["createdAt", "DESC"]]
  });
  res.json(bookings);
});

export const getUserBookings = asyncHandler(async (req, res) => {
  if (!isPrivileged(req.user) && req.params.userId !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You can only view your own booking history");
  }

  const bookings = await Booking.findAll({
    where: { userId: req.params.userId },
    order: [["createdAt", "DESC"]]
  });
  res.json(bookings);
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await findBooking(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  assertBookingAccess(req, booking);
  res.json(booking);
});

export const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await findBooking(req.params.id);
  const nextStatus = req.body.bookingStatus || req.body.status;

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  assertBookingAccess(req, booking);

  if (!bookingStatuses.includes(nextStatus)) {
    res.status(400);
    throw new Error("Invalid booking status");
  }

  booking.bookingStatus = nextStatus;
  await booking.save();
  await updateAcceptedBookingsCSV().catch(err => console.error("CSV update failed", err));

  res.json(booking);
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await findBooking(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  assertBookingAccess(req, booking);

  booking.bookingStatus = "Cancelled";
  await booking.save();
  await updateAcceptedBookingsCSV().catch(err => console.error("CSV update failed", err));
  res.json({ message: "Booking cancelled successfully", booking });
});

export const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await findBooking(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  assertBookingAccess(req, booking);
  await booking.destroy();
  await updateAcceptedBookingsCSV().catch(err => console.error("CSV update failed", err));

  res.json({ message: "Booking deleted successfully" });
});

export const assignProfessional = asyncHandler(async (req, res) => {
  const booking = await findBooking(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  booking.professionalName = req.body.professionalName || booking.professionalName;
  booking.professionalPhone = req.body.professionalPhone || booking.professionalPhone || "99988877766";
  booking.professionalPhoto = req.body.professionalPhoto || booking.professionalPhoto;
  booking.estimatedArrival = req.body.estimatedArrival || booking.estimatedArrival;
  booking.bookingStatus = "Professional Assigned";
  await booking.save();
  await updateAcceptedBookingsCSV().catch(err => console.error("CSV update failed", err));

  let whatsappAgent;
  try {
    whatsappAgent = await notifyWhatsAppAgent(booking);
  } catch (error) {
    whatsappAgent = { sent: false, error: error.message };
  }

  res.json({ booking, whatsappAgent });
});
