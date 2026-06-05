import AuthEvent from "../models/AuthEvent.js";

const clean = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const recordAuthEvent = async ({ req, user, eventType, provider }) => {
  try {
    await AuthEvent.create({
      userId: user._id,
      eventType,
      provider,
      email: clean(user.email)?.toLowerCase(),
      ipAddress: clean(req.ip),
      userAgent: clean(req.get("user-agent"))
    });
  } catch (error) {
    console.error("Auth event storage failed:", error.message);
  }
};

export default recordAuthEvent;
