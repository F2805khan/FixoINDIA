import express from "express";
import {
  createOrder,
  getAvailablePaymentMethods,
  getPaymentByBookingId,
  verifyPayment
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/methods", getAvailablePaymentMethods);
router.use(protect);

router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);
router.get("/:bookingId", getPaymentByBookingId);

export default router;
