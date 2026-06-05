import asyncHandler from "../middleware/asyncHandler.js";
import { isPrivileged } from "../middleware/authMiddleware.js";
import SupportMessage from "../models/SupportMessage.js";
import { sendSupportNotificationEmail } from "../utils/email.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createSupportMessage = asyncHandler(async (req, res) => {
  const { userId, name, email, message } = req.body;

  if (!name || !email || !message) {
    res.status(400);
    throw new Error("Name, email, and message are required");
  }

  const supportMessage = await SupportMessage.create({
    userId: req.user?._id || (userId && UUID_RE.test(String(userId)) ? userId : null),
    name,
    email,
    message
  });

  let emailNotificationSent = false;
  try {
    emailNotificationSent = await sendSupportNotificationEmail({ name, email, message });
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

  const messages = await SupportMessage.findAll({
    where: { userId: req.params.userId },
    order: [["createdAt", "DESC"]]
  });

  res.json(messages);
});
