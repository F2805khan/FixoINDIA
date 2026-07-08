import "./config/env.js";
import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import ensureAdminUser from "./utils/ensureAdminUser.js";
import { isEmailDeliveryConfigured } from "./utils/email.js";

const app = express();
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    name: "fixOindia API",
    tagline: "All Services. One Click.",
    health: "ok"
  });
});

app.get("/api/health", async (req, res) => {
  res.json({
    ok: true,
    database: "supabase",
    emailDelivery: isEmailDeliveryConfigured() ? "configured" : "not-configured"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/events", eventRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await ensureAdminUser();
  if (!isEmailDeliveryConfigured()) {
    console.warn("Resend email delivery is disabled. Set RESEND_API_KEY in backend/.env and restart the backend.");
  }
  app.listen(PORT, () => {
    console.log(`fixOindia API running on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
