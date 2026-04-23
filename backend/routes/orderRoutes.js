import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- Authenticated ---
router.use(protect);

router.get("/my", getMyOrders);
router.post("/", createOrder);
router.post("/:id/cancel", cancelOrder);
router.get("/:id", getOrder);

// --- Admin ---
router.get("/", admin, getAllOrders);
router.put("/:id/status", admin, updateOrderStatus);

export default router;
