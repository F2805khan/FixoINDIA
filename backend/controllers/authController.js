import jwt from "jsonwebtoken";
import { randomInt } from "node:crypto";
import { Op } from "../utils/sequelizeMock.js";
import asyncHandler from "../middleware/asyncHandler.js";
import User from "../models/User.js";
import buildIdentityWhere from "../utils/buildIdentityWhere.js";
import { sendLoginEmail, sendOtpEmail, sendSignupEmail } from "../utils/email.js";
import { verifyFirebaseIdToken } from "../utils/firebaseAdmin.js";
import recordAuthEvent from "../utils/recordAuthEvent.js";

const otpStore = globalThis.quickfixOtpStore || new Map();
globalThis.quickfixOtpStore = otpStore;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PURPOSES = new Set(["signup", "login", "password-reset"]);

const createToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d"
  });

const normalizeOtpKey = (value) => {
  const key = value?.trim();
  return key ? key.toLowerCase() : undefined;
};

const getOtpStoreKey = ({ user, email, identifier }) => {
  if (user?._id) return `user:${user._id}`;
  const normalizedEmail = normalizeOtpKey(email) || normalizeOtpKey(identifier);
  return normalizedEmail?.includes("@") ? `email:${normalizedEmail}` : undefined;
};

const sendAccountEmail = async (label, send) => {
  try {
    await send();
  } catch (error) {
    console.error(`${label} email failed:`, error.message);
  }
};

const publicUser = (user) => ({
  _id: user._id,
  userId: user.userId,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  city: user.city,
  latitude: user.latitude,
  longitude: user.longitude,
  subscriptionStatus: user.subscriptionStatus,
  role: user.role,
  authProvider: user.authProvider,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, userId, password, address, city, latitude, longitude } = req.body;
  const normalizedUserId = userId?.trim() ? userId.trim().toLowerCase() : undefined;

  if (!name || !email || !phone || !password || String(password).length < 6) {
    res.status(400);
    throw new Error("Name, email, phone, and password (min 6 characters) are required");
  }

  const where = buildIdentityWhere({ email, phone, userId: normalizedUserId });
  const existingUser = where ? await User.findOne({ where }) : null;
  if (existingUser) {
    res.status(409);
    throw new Error("User already exists with this email, phone, or user ID");
  }

  const user = await User.create({
    name,
    email,
    phone,
    userId: normalizedUserId,
    password,
    address,
    city,
    latitude: latitude || null,
    longitude: longitude || null,
    authProvider: "password"
  });

  await recordAuthEvent({ req, user, eventType: "signup", provider: "password" });

  await sendAccountEmail("Signup", () =>
    sendSignupEmail({
      to: user.email,
      name: user.name,
      phone: user.phone,
      userId: user.userId,
      address: user.address
    })
  );

  res.status(201).json({
    user: publicUser(user),
    token: createToken(user._id)
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, phone, userId, identifier, password } = req.body;
  const loginIdentifier = identifier || email || phone || userId;

  if (!loginIdentifier || !password) {
    res.status(400);
    throw new Error("User ID/email/phone and password are required");
  }

  const where = buildIdentityWhere({ email, phone, userId, identifier });
  const user = where ? await User.findOne({ where }) : null;

  if (!user) {
    res.status(404);
    throw new Error("User not registered");
  }

  if (!(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid login credentials");
  }

  await recordAuthEvent({ req, user, eventType: "login", provider: "password" });

  await sendAccountEmail("Login", () =>
    sendLoginEmail({ to: user.email, name: user.name, method: "password" })
  );

  res.json({
    user: publicUser(user),
    token: createToken(user._id)
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, phone, address, email, city, latitude, longitude, subscriptionStatus } = req.body;

  if (email !== undefined && email?.trim()) {
    const nextEmail = email.trim().toLowerCase();
    if (nextEmail !== user.email) {
      const taken = await User.findOne({
        where: { email: nextEmail, _id: { [Op.ne]: user._id } }
      });
      if (taken) {
        res.status(409);
        throw new Error("Email already in use");
      }
      user.email = nextEmail;
    }
  }

  if (name !== undefined) {
    user.name = String(name).trim();
    if (!user.name) {
      res.status(400);
      throw new Error("Name cannot be empty");
    }
  }

  if (phone !== undefined && phone?.trim()) {
    const nextPhone = phone.trim();
    if (nextPhone !== user.phone) {
      const taken = await User.findOne({
        where: { phone: nextPhone, _id: { [Op.ne]: user._id } }
      });
      if (taken) {
        res.status(409);
        throw new Error("Phone already in use");
      }
      user.phone = nextPhone;
    }
  }

  if (address !== undefined) {
    user.address = address ? String(address).trim() : "";
  }

  if (city !== undefined) {
    user.city = city ? String(city).trim() : "";
  }

  for (const [field, value, min, max] of [
    ["latitude", latitude, -90, 90],
    ["longitude", longitude, -180, 180]
  ]) {
    if (value === undefined) continue;
    if (value === null || String(value).trim() === "") {
      user[field] = null;
      continue;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      res.status(400);
      throw new Error(`Invalid ${field}`);
    }
    user[field] = parsed;
  }

  if (subscriptionStatus !== undefined) {
    if (!["active", "cancelled"].includes(subscriptionStatus)) {
      res.status(400);
      throw new Error("Invalid subscription status");
    }
    user.subscriptionStatus = subscriptionStatus;
  }

  await user.save();
  res.json({ user: publicUser(user) });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || String(newPassword).length < 6) {
    res.status(400);
    throw new Error("New password (min 6 characters) is required");
  }

  const user = await User.findByPk(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const hadPassword = Boolean(user.password);

  if (hadPassword && (!currentPassword || !(await user.matchPassword(currentPassword)))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  user.authProvider = "password";
  await user.save();

  res.json({ message: hadPassword ? "Password updated successfully" : "Password set successfully" });
});

export const requestOtp = asyncHandler(async (req, res) => {
  const { email, phone, userId, identifier, purpose = "login" } = req.body;
  const identityWhere = buildIdentityWhere({ email, phone, userId, identifier });
  const user = identityWhere ? await User.findOne({ where: identityWhere }) : null;
  const normalizedIdentifier = normalizeOtpKey(identifier);
  const otpRecipient =
    normalizeOtpKey(user?.email) ||
    normalizeOtpKey(email) ||
    (normalizedIdentifier?.includes("@") ? normalizedIdentifier : undefined);
  const key = getOtpStoreKey({ user, email, identifier });

  if (!OTP_PURPOSES.has(purpose)) {
    res.status(400);
    throw new Error("Invalid OTP purpose");
  }

  if (!otpRecipient || !key) {
    res.status(400);
    throw new Error("An email address is required to send OTP");
  }

  if (purpose === "signup" && user) {
    res.status(409);
    throw new Error("An account already exists. Please log in instead.");
  }

  if (purpose !== "signup" && !user) {
    res.status(404);
    throw new Error("Account not found");
  }

  const existingOtp = otpStore.get(key);
  if (existingOtp?.createdAt > Date.now() - OTP_RESEND_COOLDOWN_MS) {
    res.status(429);
    throw new Error("Please wait a minute before requesting another OTP");
  }

  const otp = randomInt(100000, 1000000).toString();
  const expires = new Date(Date.now() + OTP_EXPIRY_MS);
  otpStore.set(key, {
    otp,
    expires,
    createdAt: Date.now(),
    attempts: 0,
    purpose,
    recipient: otpRecipient,
    userId: user?._id?.toString()
  });

  if (user) {
    user.otpCode = otp;
    user.otpExpires = expires;
    await user.save();
  }

  const clearStoredOtp = async () => {
    otpStore.delete(key);
    if (user) {
      user.otpCode = null;
      user.otpExpires = null;
      await user.save();
    }
  };

  let emailSent = false;
  try {
    emailSent = otpRecipient ? await sendOtpEmail({ to: otpRecipient, otp }) : false;
  } catch (error) {
    await clearStoredOtp();
    res.status(502);
    throw new Error(`Unable to send OTP email: ${error.message}`);
  }

  if (!emailSent && process.env.NODE_ENV === "production") {
    await clearStoredOtp();
    res.status(503);
    throw new Error("OTP delivery is not configured for this account");
  }

  res.json({
    message: emailSent
      ? "OTP sent successfully. Please check your email."
      : "OTP generated locally. Configure Resend for email delivery.",
    ...(!emailSent ? { otp } : {})
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, phone, userId, identifier, otp, newPassword } = req.body;

  if (!otp || !newPassword || String(newPassword).length < 6) {
    res.status(400);
    throw new Error("OTP and new password (min 6 characters) are required");
  }

  const where = buildIdentityWhere({ email, phone, userId, identifier });
  const user = where ? await User.findOne({ where }) : null;

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const key = getOtpStoreKey({ user });
  const stored = otpStore.get(key);
  const now = new Date();
  const storedOtpValid =
    stored?.purpose === "password-reset" && stored.otp === otp && stored.expires > now;

  if (!storedOtpValid) {
    if (stored) {
      stored.attempts = (stored.attempts || 0) + 1;
      if (stored.attempts >= OTP_MAX_ATTEMPTS) otpStore.delete(key);
    }
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  user.password = newPassword;
  user.authProvider = "password";
  user.otpCode = null;
  user.otpExpires = null;
  await user.save();

  otpStore.delete(key);
  await recordAuthEvent({ req, user, eventType: "password-reset", provider: "otp" });

  res.json({ message: "Password reset successfully" });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { name, email, phone, userId, identifier, otp, address, purpose = "login" } = req.body;
  const identityWhere = buildIdentityWhere({ email, phone, userId, identifier });
  const existingUser = identityWhere ? await User.findOne({ where: identityWhere }) : null;
  const key = getOtpStoreKey({ user: existingUser, email, identifier });

  if (!OTP_PURPOSES.has(purpose) || purpose === "password-reset") {
    res.status(400);
    throw new Error("Invalid OTP verification purpose");
  }

  if (!key || !otp) {
    res.status(400);
    throw new Error("Email and OTP are required");
  }

  if (purpose === "signup" && existingUser) {
    res.status(409);
    throw new Error("An account already exists. Please log in instead.");
  }

  if (purpose === "login" && !existingUser) {
    res.status(404);
    throw new Error("Account not found");
  }

  if (purpose === "signup" && !email?.trim()) {
    res.status(400);
    throw new Error("Email is required for OTP signup");
  }

  const stored = otpStore.get(key);
  const storedOtpValid = stored?.purpose === purpose && stored.otp === otp && stored.expires > new Date();
  if (!storedOtpValid) {
    if (stored) {
      stored.attempts = (stored.attempts || 0) + 1;
      if (stored.attempts >= OTP_MAX_ATTEMPTS) otpStore.delete(key);
    }
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  let user = existingUser;
  const isSignup = !user;
  if (!user) {
    user = await User.create({
      name: name || email?.split("@")[0] || "fixOindia Customer",
      email,
      phone: phone || null,
      userId: userId?.trim() ? userId.trim().toLowerCase() : undefined,
      address,
      authProvider: "otp"
    });
  } else {
    user.authProvider = "otp";
    user.otpCode = null;
    user.otpExpires = null;
    if (address) user.address = address;
    await user.save();
  }

  otpStore.delete(key);
  await recordAuthEvent({
    req,
    user,
    eventType: isSignup ? "signup" : "login",
    provider: "otp"
  });

  await sendAccountEmail(isSignup ? "Signup" : "Login", () =>
    isSignup
      ? sendSignupEmail({
          to: user.email,
          name: user.name,
          phone: user.phone,
          userId: user.userId,
          address: user.address
        })
      : sendLoginEmail({ to: user.email, name: user.name, method: "email OTP" })
  );

  res.json({
    user: publicUser(user),
    token: createToken(user._id)
  });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken, tokenId, mode = "login" } = req.body;
  const firebaseIdToken = idToken || tokenId;

  if (!firebaseIdToken) {
    res.status(400);
    throw new Error("Firebase Google login token is required");
  }

  let decodedToken;
  try {
    if (process.env.ALLOW_DEMO_GOOGLE_AUTH === "true" || process.env.NODE_ENV !== "production") {
      decodedToken = jwt.decode(firebaseIdToken);
      if (!decodedToken) {
        throw new Error("Could not decode JWT");
      }
      if (!decodedToken.uid) {
        decodedToken.uid = decodedToken.sub || decodedToken.user_id;
      }
    } else {
      decodedToken = await verifyFirebaseIdToken(firebaseIdToken);
    }
  } catch (error) {
    console.error("Google auth validation failed:", error.message);
    res.status(401);
    throw new Error("Invalid or expired Firebase login. Please try Gmail login again.");
  }

  if (decodedToken.firebase?.sign_in_provider !== "google.com") {
    res.status(401);
    throw new Error("Use a Gmail account to continue");
  }

  const email = decodedToken.email?.trim().toLowerCase();
  if (!email || decodedToken.email_verified === false) {
    res.status(401);
    throw new Error("Gmail login requires a verified email address");
  }

  let user = await User.findOne({ where: { email } });
  const isSignup = !user;

  if (!user && mode !== "signup") {
    res.status(404);
    throw new Error("Account not found. Choose Signup and continue with Gmail first.");
  }

  if (!user) {
    user = await User.create({
      name: decodedToken.name || email.split("@")[0] || "fixOindia Customer",
      email,
      phone: decodedToken.phone_number || null,
      address: "",
      authProvider: "google",
      googleId: decodedToken.uid
    });
  } else {
    user.authProvider = "google";
    user.googleId = decodedToken.uid;
    if (!user.name && decodedToken.name) user.name = decodedToken.name;
    if (!user.phone && decodedToken.phone_number) user.phone = decodedToken.phone_number;
    await user.save();
  }

  await recordAuthEvent({
    req,
    user,
    eventType: isSignup ? "signup" : "login",
    provider: "google"
  });

  await sendAccountEmail(isSignup ? "Signup" : "Login", () =>
    isSignup
      ? sendSignupEmail({
          to: user.email,
          name: user.name,
          phone: user.phone,
          userId: user.userId,
          address: user.address
        })
      : sendLoginEmail({ to: user.email, name: user.name, method: "Gmail" })
  );

  res.status(isSignup ? 201 : 200).json({
    user: publicUser(user),
    token: createToken(user._id)
  });
});
