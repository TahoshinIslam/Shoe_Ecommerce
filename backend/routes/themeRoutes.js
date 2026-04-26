import express from "express";
import {
  getActiveTheme,
  getAllThemes,
  getTheme,
  createTheme,
  updateTheme,
  activateTheme,
  deleteTheme,
  seedPresets,
} from "../controllers/themeController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public — frontend fetches active theme on every boot
router.get("/active", getActiveTheme);

// --- Admin ---
router.get("/", protect, authorize("manageThemes"), getAllThemes);
router.post("/", protect, authorize("manageThemes"), createTheme);
router.post("/seed-presets", protect, authorize("manageThemes"), seedPresets);
router.get("/:id", protect, authorize("manageThemes"), getTheme);
router.put("/:id", protect, authorize("manageThemes"), updateTheme);
router.post("/:id/activate", protect, authorize("manageThemes"), activateTheme);
router.delete("/:id", protect, authorize("manageThemes"), deleteTheme);

export default router;
