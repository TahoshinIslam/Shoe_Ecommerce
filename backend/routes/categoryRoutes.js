import express from "express";
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getCategories);
router.get("/:id", getCategory);

router.post("/", protect, authorize("manageCategories"), createCategory);
router.put("/:id", protect, authorize("manageCategories"), updateCategory);
router.delete("/:id", protect, authorize("manageCategories"), deleteCategory);

export default router;
