import express from "express";
import { body } from "express-validator";
import {
  registerUser,
  loginUser,
  logoutUser,
  verifyEmail,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { authLimiter, passwordLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validator.js";

const router = express.Router();

// --- Public / auth ---
router.post(
  "/register",
  authLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate,
  registerUser,
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  loginUser,
);

router.post("/logout", logoutUser);
router.get("/verify-email/:token", verifyEmail);

router.post(
  "/forgot-password",
  passwordLimiter,
  [body("email").isEmail().withMessage("Valid email required").normalizeEmail()],
  validate,
  forgotPassword,
);

router.post(
  "/reset-password/:token",
  passwordLimiter,
  [body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")],
  validate,
  resetPassword,
);

// --- Authenticated user ---
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

// --- Admin ---
router.get("/", protect, admin, getAllUsers);
router.get("/:id", protect, admin, getUserById);
router.put("/:id", protect, admin, updateUser);
router.delete("/:id", protect, admin, deleteUser);

export default router;
