import express from "express";
import { body } from "express-validator";
import {
  getProducts,
  getFeatured,
  getProductByIdOrSlug,
  getRelated,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validator.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/featured", getFeatured);
router.get("/:idOrSlug", getProductByIdOrSlug);
router.get("/:id/related", getRelated);

// --- Admin ---
router.post(
  "/",
  protect,
  admin,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
    body("basePrice").isFloat({ gt: 0 }).withMessage("Price must be > 0"),
    body("category").notEmpty().withMessage("Category is required"),
    body("brand").notEmpty().withMessage("Brand is required"),
    body("gender").isIn(["men", "women", "kids", "unisex"]).withMessage("Invalid gender"),
    body("images").isArray({ min: 1 }).withMessage("At least one image required"),
    body("sizes").isArray({ min: 1 }).withMessage("At least one size required"),
  ],
  validate,
  createProduct,
);

router.put("/:id", protect, admin, updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

export default router;
