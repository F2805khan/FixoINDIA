import express from "express";
import {
  createService,
  deleteService,
  getServiceById,
  getServiceCategories,
  getServices,
  updateService
} from "../controllers/serviceController.js";
import { owner, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/categories", getServiceCategories);
router.route("/").get(getServices).post(protect, owner, createService);
router.route("/:id").get(getServiceById).put(protect, owner, updateService).delete(protect, owner, deleteService);

export default router;
