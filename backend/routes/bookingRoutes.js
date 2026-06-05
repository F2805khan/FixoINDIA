import express from "express";
import {
  cancelBooking,
  createBooking,
  deleteBooking,
  getBookingById,
  getMyBookings,
  getUserBookings,
  updateBookingStatus
} from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createBooking);
router.get("/me", getMyBookings);
router.get("/user/:userId", getUserBookings);
router.get("/:id", getBookingById);
router.put("/:id/status", updateBookingStatus);
router.put("/:id/cancel", cancelBooking);
router.delete("/:id", deleteBooking);

export default router;
