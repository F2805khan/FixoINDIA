import express from "express";
import { generateImage } from "../controllers/imageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Using protect middleware to ensure only logged-in users can generate images
router.post("/generate", protect, generateImage);

export default router;
