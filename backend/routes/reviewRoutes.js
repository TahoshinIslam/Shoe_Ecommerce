import express from "express";
import { body } from "express-validator";
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
} from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validator.js";

const router = express.Router();

router.get("/product/:productId", getProductReviews);

router.post(
  "/product/:productId",
  protect,
  [
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
    body("comment").trim().notEmpty().withMessage("Comment is required"),
    body("images").optional().isArray({ max: 5 }).withMessage("Max 5 images"),
  ],
  validate,
  createReview,
);

router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);
router.post("/:id/helpful", protect, markHelpful);

export default router;
