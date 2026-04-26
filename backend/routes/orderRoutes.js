import express from "express";
import {
  createOrder,
  previewOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/my", getMyOrders);
router.post("/", createOrder);
router.post("/preview", previewOrder);
router.post("/:id/cancel", cancelOrder);
router.get("/:id", getOrder);

router.get("/", authorize("readOrders"), getAllOrders);
router.put("/:id/status", authorize("manageOrders"), updateOrderStatus);

export default router;
