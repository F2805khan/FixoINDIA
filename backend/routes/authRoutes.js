import express from "express";
import {
  getProfile,
  googleLogin,
  loginUser,
  registerUser,
  requestOtp,
  resetPassword,
  updatePassword,
  updateProfile,
  verifyOtp
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, updatePassword);
router.post("/request-otp", requestOtp);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOtp);
router.post("/google", googleLogin);

export default router;
