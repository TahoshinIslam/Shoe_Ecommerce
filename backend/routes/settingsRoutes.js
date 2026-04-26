import express from "express";
import {
  getPublicSettings,
  getSettings,
  updateSettings,
} from "../controllers/settingsController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/public", getPublicSettings);
router.get("/", protect, authorize("manageSettings"), getSettings);
router.put("/", protect, authorize("manageSettings"), updateSettings);

export default router;
