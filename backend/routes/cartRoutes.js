import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect); // all cart routes require auth

router.get("/", getCart);
router.post("/", addToCart);
router.put("/", updateCartItem);
router.delete("/", clearCart);
router.delete("/:productId/:size", removeFromCart);

export default router;
