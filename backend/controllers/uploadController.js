import asyncHandler from "../middleware/asyncHandler.js";
import { uploadBuffer, deleteImage } from "../utils/cloudinaryUpload.js";

// @desc    Upload single image
// @route   POST /api/upload
// @access  Private (admin for products; user for review photos / avatar)
export const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }
  const folder = req.query.folder || "shoestore";
  try {
    const result = await uploadBuffer(req.file.buffer, folder);
    res.status(201).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    res.status(500);
    throw new Error(
      err.message || "Image upload failed. Check Cloudinary configuration.",
    );
  }
});

// @desc    Upload multiple images
// @route   POST /api/upload/multiple
// @access  Private
export const uploadMultiple = asyncHandler(async (req, res) => {
  if (!req.files?.length) {
    res.status(400);
    throw new Error("No files uploaded");
  }
  const folder = req.query.folder || "shoestore";
  try {
    const results = await Promise.all(
      req.files.map((f) => uploadBuffer(f.buffer, folder)),
    );
    res.status(201).json({
      success: true,
      files: results.map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
        width: r.width,
        height: r.height,
      })),
    });
  } catch (err) {
    res.status(500);
    throw new Error(
      err.message || "Image upload failed. Check Cloudinary configuration.",
    );
  }
});

// @desc    Delete image by public ID
// @route   DELETE /api/upload/:publicId
// @access  Admin
export const removeImage = asyncHandler(async (req, res) => {
  const publicId = decodeURIComponent(req.params.publicId);
  try {
    const result = await deleteImage(publicId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500);
    throw new Error(
      err.message || "Image deletion failed. Check Cloudinary configuration.",
    );
  }
});
