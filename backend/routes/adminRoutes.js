import express from "express";
import {
  createBeautyArtist,
  deleteBeautyArtist,
  getBeautyArtists,
  updateBeautyArtist
} from "../controllers/beautyController.js";
import {
  getAllBookings,
  getOverview,
  getPayments,
  getPaymentMethods,
  getSupportInbox,
  getUsers,
  resetUserPassword,
  replyToSupportMessage,
  updatePaymentMethods,
  exportAcceptedBookingsExcel
} from "../controllers/adminController.js";
import { createCoupon, deleteCoupon, getCoupons, updateCoupon } from "../controllers/couponController.js";
import { cancelBooking, assignProfessional, updateBookingStatus } from "../controllers/bookingController.js";
import {
  createService,
  deleteService,
  getServices,
  updateService
} from "../controllers/serviceController.js";
import { owner, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, owner);

router.get("/overview", getOverview);
router.get("/beauty-artists", getBeautyArtists);
router.post("/beauty-artists", createBeautyArtist);
router.put("/beauty-artists/:id", updateBeautyArtist);
router.delete("/beauty-artists/:id", deleteBeautyArtist);
router.get("/services", getServices);
router.post("/services", createService);
router.put("/services/:id", updateService);
router.delete("/services/:id", deleteService);
router.get("/bookings", getAllBookings);
router.get("/bookings/export-excel", exportAcceptedBookingsExcel);
router.put("/bookings/:id/status", updateBookingStatus);
router.put("/bookings/:id/assign", assignProfessional);
router.put("/bookings/:id/cancel", cancelBooking);
router.get("/users", getUsers);
router.put("/users/:id/password", resetUserPassword);
router.get("/payments", getPayments);
router.get("/payment-methods", getPaymentMethods);
router.put("/payment-methods", updatePaymentMethods);
router.get("/coupons", getCoupons);
router.post("/coupons", createCoupon);
router.put("/coupons/:id", updateCoupon);
router.delete("/coupons/:id", deleteCoupon);
router.get("/support", getSupportInbox);
router.put("/support/:id/reply", replyToSupportMessage);

export default router;
