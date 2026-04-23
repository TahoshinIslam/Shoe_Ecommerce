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
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public — frontend fetches active theme on every boot
router.get("/active", getActiveTheme);

// --- Admin ---
router.get("/", protect, admin, getAllThemes);
router.post("/", protect, admin, createTheme);
router.post("/seed-presets", protect, admin, seedPresets);
router.get("/:id", protect, admin, getTheme);
router.put("/:id", protect, admin, updateTheme);
router.post("/:id/activate", protect, admin, activateTheme);
router.delete("/:id", protect, admin, deleteTheme);

export default router;
