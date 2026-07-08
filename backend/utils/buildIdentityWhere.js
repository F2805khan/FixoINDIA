import { Op } from "./sequelizeMock.js";

export default function buildIdentityWhere({ email, phone, userId, identifier }) {
  const parts = [];
  if (email?.trim()) {
    parts.push({ email: email.trim().toLowerCase() });
  }
  if (phone?.trim()) {
    parts.push({ phone: phone.trim() });
  }
  if (userId?.trim()) {
    parts.push({ userId: userId.trim().toLowerCase() });
  }
  if (identifier?.trim()) {
    const id = identifier.trim();
    const norm = id.toLowerCase();
    parts.push({ email: norm }, { phone: id }, { userId: norm });
  }
  return parts.length ? { [Op.or]: parts } : null;
}
