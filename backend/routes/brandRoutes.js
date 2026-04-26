import express from "express";
import {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/brandController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getBrands);
router.get("/:id", getBrand);

router.post("/", protect, authorize("manageBrands"), createBrand);
router.put("/:id", protect, authorize("manageBrands"), updateBrand);
router.delete("/:id", protect, authorize("manageBrands"), deleteBrand);

export default router;
