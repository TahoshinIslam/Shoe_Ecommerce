import cloudinary from "../config/cloudinary.js";

/**
 * Upload a buffer (from multer memoryStorage) to Cloudinary.
 * @param {Buffer} buffer
 * @param {string} folder - destination folder
 */
export const uploadBuffer = (buffer, folder = "shoestore") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });

export const deleteImage = (publicId) =>
  cloudinary.uploader.destroy(publicId, { resource_type: "image" });
