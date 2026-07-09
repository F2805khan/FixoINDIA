import { Op } from "../utils/sequelizeMock.js";
import asyncHandler from "../middleware/asyncHandler.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Service from "../models/Service.js";
import SupportMessage from "../models/SupportMessage.js";
import User from "../models/User.js";
import { sendSupportReplyEmail } from "../utils/email.js";
import { getPaymentMethodSettings, updatePaymentMethodSettings } from "../utils/paymentMethods.js";
import { getAuthMethodSettings, updateAuthMethodSettings } from "../utils/authMethods.js";
import { updateAcceptedBookingsCSV } from "../utils/excelExporter.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultBookingsSheetCsvUrl =
  "https://docs.google.com/spreadsheets/d/1N1FV_XGYcN1St4ZHK4sZj-rpibYI69M9i7tZx_B3WF0/export?format=csv";

const getBookingsSheetCsvUrl = () =>
  (process.env.GOOGLE_BOOKINGS_SHEET_CSV_URL || defaultBookingsSheetCsvUrl).trim();


const customerAttributes = ["_id", "userId", "name", "email", "phone", "address", "city", "latitude", "longitude"];

const mapBookingWithUser = (b) => {
  const plain = b.get({ plain: true });
  const customer = plain.customer || null;
  plain.customerProfile = customer;
  plain.userId = plain.customer || plain.userId;
  delete plain.customer;
  delete plain.service;
  return plain;
};

const mapSupportWithUser = (m) => {
  const plain = m.get({ plain: true });
  plain.userId = plain.customer || plain.userId;
  delete plain.customer;
  return plain;
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStartOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDayLabel = (date) =>
  date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });

export const getOverview = asyncHandler(async (req, res) => {
  const now = new Date();
  const todayStart = getStartOfDay(now);
  const sevenDayStart = addDays(todayStart, -6);

  const [bookings, users, serviceCount, paymentCount] = await Promise.all([
    Booking.findAll({
      include: [{ model: User, as: "customer", attributes: customerAttributes }],
      order: [["createdAt", "DESC"]]
    }),
    User.findAll({
      attributes: { exclude: ["password", "otpCode", "otpExpires"] },
      where: { role: { [Op.notIn]: ["admin", "owner"] } },
      order: [["createdAt", "DESC"]]
    }),
    Service.count(),
    Payment.count()
  ]);

  const dailyUsers = new Map();
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(sevenDayStart, index);
    const key = formatDateKey(date);
    dailyUsers.set(key, new Set());
    return {
      date: key,
      label: formatDayLabel(date),
      orders: 0,
      activeUsers: 0,
      revenue: 0
    };
  });
  const dailyByDate = new Map(daily.map((day) => [day.date, day]));
  const activeUserIds = new Set();
  const statusCounts = {};
  let ordersToday = 0;
  let revenueToday = 0;
  let activeOrders = 0;

  bookings.forEach((booking) => {
    const plain = booking.get({ plain: true });
    const createdAt = new Date(plain.createdAt);
    const status = plain.bookingStatus || "Confirmed";
    const amount = Number(plain.amount) || 0;

    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (!["Completed", "Cancelled"].includes(status)) {
      activeOrders += 1;
    }

    if (createdAt >= todayStart) {
      ordersToday += 1;
      revenueToday += amount;
    }

    if (createdAt >= sevenDayStart) {
      const key = formatDateKey(createdAt);
      const day = dailyByDate.get(key);
      if (day) {
        day.orders += 1;
        day.revenue += amount;
        dailyUsers.get(key)?.add(String(plain.userId));
      }

      if (status !== "Cancelled") {
        activeUserIds.add(String(plain.userId));
      }
    }
  });

  daily.forEach((day) => {
    day.activeUsers = dailyUsers.get(day.date)?.size || 0;
  });

  res.json({
    totals: {
      services: serviceCount,
      users: users.length,
      orders: bookings.length,
      ordersToday,
      activeOrders,
      activeUsers: activeUserIds.size,
      payments: paymentCount,
      revenueToday
    },
    daily,
    statusCounts,
    recentBookings: bookings.slice(0, 8).map(mapBookingWithUser),
    recentUsers: users.slice(0, 8)
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: { exclude: ["password", "otpCode", "otpExpires"] },
    order: [["createdAt", "DESC"]]
  });
  res.json(users);
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  const { password, newPassword } = req.body;
  const nextPassword = password || newPassword;

  if (!nextPassword || String(nextPassword).length < 6) {
    res.status(400);
    throw new Error("New password must be at least 6 characters");
  }

  const user = await User.findByPk(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.password = nextPassword;
  user.authProvider = "password";
  await user.save();

  res.json({
    message: "Password reset successfully",
    user: {
      _id: user._id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      authProvider: user.authProvider
    }
  });
});

export const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.findAll({
    include: [{ model: User, as: "customer", attributes: customerAttributes }],
    order: [["createdAt", "DESC"]]
  });
  res.json(bookings.map(mapBookingWithUser));
});

export const getPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.findAll({ order: [["createdAt", "DESC"]] });
  res.json(payments);
});

export const getPaymentMethods = asyncHandler(async (req, res) => {
  res.json(await getPaymentMethodSettings());
});

export const updatePaymentMethods = asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body.methods) || !req.body.methods.length) {
    res.status(400);
    throw new Error("At least one payment method setting is required");
  }

  const methods = await updatePaymentMethodSettings(req.body.methods);

  res.json(methods);
});

export const getAuthMethods = asyncHandler(async (req, res) => {
  res.json(await getAuthMethodSettings());
});

export const updateAuthMethods = asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body.methods) || !req.body.methods.length) {
    res.status(400);
    throw new Error("At least one auth method setting is required");
  }

  const methods = await updateAuthMethodSettings(req.body.methods);
  res.json(methods);
});

export const getSupportInbox = asyncHandler(async (req, res) => {
  const messages = await SupportMessage.findAll({
    include: [{ model: User, as: "customer", attributes: ["_id", "userId", "name", "email", "phone"] }],
    order: [["createdAt", "DESC"]]
  });
  res.json(messages.map(mapSupportWithUser));
});

export const replyToSupportMessage = asyncHandler(async (req, res) => {
  const message = await SupportMessage.findByPk(req.params.id);

  if (!message) {
    res.status(404);
    throw new Error("Support message not found");
  }

  message.reply = req.body.reply || message.reply;
  message.status = req.body.status || "Replied";
  await message.save();

  let emailReplySent = false;
  if (req.body.reply?.trim() && message.email) {
    try {
      emailReplySent = await sendSupportReplyEmail({
        to: message.email,
        name: message.name,
        reply: req.body.reply
      });
    } catch (error) {
      console.error("Support reply email failed:", error.message);
    }
  }

  res.json({ ...message.toJSON(), emailReplySent });
});

export const exportAcceptedBookingsExcel = asyncHandler(async (req, res) => {
  const sheetCsvUrl = getBookingsSheetCsvUrl();

  if (sheetCsvUrl && typeof fetch === "function") {
    try {
      const sheetResponse = await fetch(sheetCsvUrl);
      if (!sheetResponse.ok) {
        throw new Error(`Google Sheet export returned ${sheetResponse.status}`);
      }

      const csv = await sheetResponse.text();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="accepted_bookings.csv"');
      res.send(csv);
      return;
    } catch (error) {
      console.error("Google Sheet export failed, falling back to local CSV:", error.message);
    }
  }

  await updateAcceptedBookingsCSV();
  const filePath = path.join(__dirname, "../data/accepted_bookings.csv");
  res.download(filePath, "accepted_bookings.csv");
});
