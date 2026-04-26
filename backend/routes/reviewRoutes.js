import express from "express";
import { body } from "express-validator";
import {
  getProductReviews,
  listAllReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  replyToReview,
} from "../controllers/reviewController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validator.js";

const router = express.Router();

// Admin-wide listing (must come before /:id-style routes)
router.get("/", protect, authorize("readReviews"), listAllReviews);

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
router.post("/:id/reply", protect, authorize("manageReviews"), replyToReview);

export default router;
