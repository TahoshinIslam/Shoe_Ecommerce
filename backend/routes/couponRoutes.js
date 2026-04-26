import express from "express";
import {
  validateCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/validate", protect, validateCoupon);

// --- Admin ---
router.get("/", protect, authorize("manageCoupons"), getAllCoupons);
router.post("/", protect, authorize("manageCoupons"), createCoupon);
router.put("/:id", protect, authorize("manageCoupons"), updateCoupon);
router.delete("/:id", protect, authorize("manageCoupons"), deleteCoupon);

export default router;
