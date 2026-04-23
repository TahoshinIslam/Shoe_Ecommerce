import express from "express";
import {
  uploadSingle,
  uploadMultiple,
  removeImage,
} from "../controllers/uploadController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Single upload — any authenticated user (for review photos, avatars)
router.post("/", protect, upload.single("image"), uploadSingle);

// Multiple — up to 8 images at once
router.post("/multiple", protect, upload.array("images", 8), uploadMultiple);

// Delete by Cloudinary publicId (admin only)
router.delete("/:publicId", protect, admin, removeImage);

export default router;
