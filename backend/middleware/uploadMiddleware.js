import multer from "multer";
import path from "path";

// Memory storage → we stream buffer straight to Cloudinary (no disk writes)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|avif/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error("Only jpeg, jpg, png, webp, avif images are allowed"));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
