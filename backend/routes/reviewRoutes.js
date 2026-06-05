import express from "express";
import { sendReviewConfirmation } from "../controllers/reviewController.js";

const router = express.Router();

router.post("/confirmation", sendReviewConfirmation);

export default router;
