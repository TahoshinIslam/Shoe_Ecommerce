import express from "express";
import {
  getOverview,
  getSalesSeries,
  getTopProducts,
  getStatusBreakdown,
  getRevenueByMethod,
} from "../controllers/analyticsController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("readAnalytics"));

router.get("/overview", getOverview);
router.get("/sales-series", getSalesSeries);
router.get("/top-products", getTopProducts);
router.get("/status-breakdown", getStatusBreakdown);
router.get("/revenue-by-method", getRevenueByMethod);

export default router;
