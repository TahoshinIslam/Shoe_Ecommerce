import express from "express";
import {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/brandController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getBrands);
router.get("/:id", getBrand);

router.post("/", protect, admin, createBrand);
router.put("/:id", protect, admin, updateBrand);
router.delete("/:id", protect, admin, deleteBrand);

export default router;
