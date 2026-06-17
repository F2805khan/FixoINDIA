import express from "express";
import {
  createSupportMessage,
  getSupportMessagesByUser
} from "../controllers/supportController.js";
import { optionalProtect, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/message", optionalProtect, createSupportMessage);
router.get("/messages/:userId", protect, getSupportMessagesByUser);

export default router;
