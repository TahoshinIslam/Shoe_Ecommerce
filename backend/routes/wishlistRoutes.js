import express from "express";
import {
  getWishlist,
  toggleWishlist,
  clearWishlist,
} from "../controllers/wishlistController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getWishlist);
router.delete("/", clearWishlist);
router.post("/:productId", toggleWishlist);

export default router;
