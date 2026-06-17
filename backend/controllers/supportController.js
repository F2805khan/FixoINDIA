import { randomBytes } from "crypto";
import { Op } from "sequelize";
import asyncHandler from "../middleware/asyncHandler.js";
import { isPrivileged } from "../middleware/authMiddleware.js";
import SupportMessage from "../models/SupportMessage.js";
import { sendSupportNotificationEmail } from "../utils/email.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const makeTicketCandidate = () => {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `FS-${dateKey}-${randomBytes(3).toString("hex").toUpperCase()}`;
};

const generateTicketId = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ticketId = makeTicketCandidate();
    const existing = await SupportMessage.findOne({ where: { ticketId } });
    if (!existing) return ticketId;
  }

  return `FS-${Date.now()}-${randomBytes(2).toString("hex").toUpperCase()}`;
};

export const createSupportMessage = asyncHandler(async (req, res) => {
  const { userId, name, email, message } = req.body;

  if (!name || !email || !message) {
    res.status(400);
    throw new Error("Name, email, and message are required");
  }

  const resolvedUserId = req.user?._id || (userId && UUID_RE.test(String(userId)) ? userId : null);
  const accountUserId = req.user?.userId || null;
  const ticketId = await generateTicketId();

  const supportMessage = await SupportMessage.create({
    userId: resolvedUserId,
    ticketId,
    name,
    email,
    message
  });

  let emailNotificationSent = false;
  try {
    emailNotificationSent = await sendSupportNotificationEmail({
      ticketId,
      name,
      email,
      message,
      userId: accountUserId || resolvedUserId,
      backendUserId: resolvedUserId,
      createdAt: supportMessage.createdAt
    });
  } catch (error) {
    console.error("Support notification email failed:", error.message);
  }

  res.status(201).json({
    message: "Support message received",
    supportMessage,
    emailNotificationSent
  });
});

export const getSupportMessagesByUser = asyncHandler(async (req, res) => {
  if (!isPrivileged(req.user) && req.params.userId !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You can only view your own support messages");
  }

  const filters = [{ userId: req.params.userId }];
  if (req.params.userId === req.user._id.toString() && req.user.email) {
    filters.push({ email: req.user.email });
  }

  const messages = await SupportMessage.findAll({
    where: { [Op.or]: filters },
    order: [["createdAt", "DESC"]]
  });

  res.json(messages);
});
