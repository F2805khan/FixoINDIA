import { Op } from "sequelize";
import User from "../models/User.js";

const normalize = (value) => (value?.trim() ? value.trim() : undefined);
const normalizeLower = (value) => normalize(value)?.toLowerCase();

const ensureAdminUser = async () => {
  const adminUserId = normalizeLower(process.env.ADMIN_USER_ID);
  const adminEmail = normalizeLower(process.env.ADMIN_EMAIL);
  const adminPhone = normalize(process.env.ADMIN_PHONE);
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || (!adminUserId && !adminEmail && !adminPhone)) {
    console.warn(
      "Admin bootstrap skipped. Set ADMIN_USER_ID/ADMIN_EMAIL/ADMIN_PHONE and ADMIN_PASSWORD in backend/.env."
    );
    return;
  }

  const identity = [
    adminUserId ? { userId: adminUserId } : null,
    adminEmail ? { email: adminEmail } : null,
    adminPhone ? { phone: adminPhone } : null
  ].filter(Boolean);

  let admin = await User.findOne({
    where: { [Op.or]: identity }
  });

  if (!admin) {
    admin = await User.create({
      name: normalize(process.env.ADMIN_NAME) || "FunService Control",
      userId: adminUserId,
      email: adminEmail,
      phone: adminPhone,
      password: adminPassword,
      role: "owner",
      authProvider: "password"
    });
  } else {
    admin.role = "owner";
    admin.authProvider = "password";
    const preferredName = normalize(process.env.ADMIN_NAME) || "FunService Control";
    if (!admin.name || admin.name.toLowerCase() === "quickfix admin") {
      admin.name = preferredName;
    }
    if (adminUserId && admin.userId !== adminUserId) admin.userId = adminUserId;
    if (adminEmail && admin.email !== adminEmail) admin.email = adminEmail;
    if (adminPhone && admin.phone !== adminPhone) admin.phone = adminPhone;
    if (!admin.password || process.env.ADMIN_PASSWORD_RESET_ON_START === "true") {
      admin.password = adminPassword;
    }
    await admin.save();
  }

  console.log(`Owner ready: ${admin.userId || admin.email || admin.phone}`);
};

export default ensureAdminUser;
