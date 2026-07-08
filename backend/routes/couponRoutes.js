import express from "express";
import { applyCoupon } from "../controllers/couponController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.post("/apply", applyCoupon);

export default router;
