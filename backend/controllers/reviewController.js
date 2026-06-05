import asyncHandler from "../middleware/asyncHandler.js";
import { sendReviewConfirmationEmail, sendReviewNotificationEmail } from "../utils/email.js";

const clean = (value) => String(value ?? "").trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REVIEW_WINDOW_MS = 60 * 60 * 1000;
const REVIEW_RECIPIENT_COOLDOWN_MS = 10 * 60 * 1000;
const REVIEW_MAX_PER_IP = 5;
const reviewAttemptsByIp = globalThis.quickfixReviewAttemptsByIp || new Map();
const reviewAttemptsByRecipient = globalThis.quickfixReviewAttemptsByRecipient || new Map();
globalThis.quickfixReviewAttemptsByIp = reviewAttemptsByIp;
globalThis.quickfixReviewAttemptsByRecipient = reviewAttemptsByRecipient;

export const sendReviewConfirmation = asyncHandler(async (req, res) => {
  const review = {
    reviewId: clean(req.body.reviewId),
    name: clean(req.body.name),
    email: clean(req.body.email).toLowerCase(),
    city: clean(req.body.city),
    service: clean(req.body.service),
    rating: Number(req.body.rating),
    text: clean(req.body.text),
    createdAt: req.body.createdAt
  };

  if (!review.name || !review.email || !review.city || !review.service || !review.text) {
    res.status(400);
    throw new Error("Name, email, city, service, and feedback are required");
  }

  if (!EMAIL_RE.test(review.email)) {
    res.status(400);
    throw new Error("A valid email address is required");
  }

  if (review.name.length > 100 || review.city.length > 100 || review.service.length > 100 || review.text.length > 2000) {
    res.status(400);
    throw new Error("Review details are too long");
  }

  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5");
  }

  const now = Date.now();
  const ip = req.ip || "unknown";
  const recentIpAttempts = (reviewAttemptsByIp.get(ip) || []).filter(
    (attemptedAt) => attemptedAt > now - REVIEW_WINDOW_MS
  );
  const lastRecipientAttempt = reviewAttemptsByRecipient.get(review.email) || 0;

  if (recentIpAttempts.length >= REVIEW_MAX_PER_IP || lastRecipientAttempt > now - REVIEW_RECIPIENT_COOLDOWN_MS) {
    res.status(429);
    throw new Error("Please wait before requesting another review confirmation email");
  }

  reviewAttemptsByIp.set(ip, [...recentIpAttempts, now]);
  reviewAttemptsByRecipient.set(review.email, now);

  const emailSent = await sendReviewConfirmationEmail({
    to: review.email,
    ...review
  });
  let adminEmailSent = false;
  try {
    adminEmailSent = await sendReviewNotificationEmail(review);
  } catch (error) {
    console.error("Review notification email failed:", error.message);
  }

  res.status(emailSent ? 200 : 202).json({
    message: emailSent
      ? "Review confirmation email sent"
      : "Review received. Configure Resend to deliver confirmation emails.",
    emailSent,
    adminEmailSent
  });
});
