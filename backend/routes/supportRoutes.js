import express from "express";
import {
  createSupportMessage,
  getSupportMessagesByUser
} from "../controllers/supportController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/message", createSupportMessage);
router.get("/messages/:userId", protect, getSupportMessagesByUser);

export default router;
