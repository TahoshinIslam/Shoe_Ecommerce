import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";
import { cartMutationLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(protect); // all cart routes require auth

router.get("/", getCart);
router.post("/", cartMutationLimiter, addToCart);
router.put("/", cartMutationLimiter, updateCartItem);
router.delete("/", cartMutationLimiter, clearCart);
router.delete("/:productId/:size", cartMutationLimiter, removeFromCart);

export default router;
