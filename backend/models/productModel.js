import mongoose from "mongoose";
import slugify from "slugify";

const sizeStockSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true, // e.g. "40", "41", "42", "US 9", "UK 8"
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "categories",
      required: [true, "Category is required"],
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "brands",
      required: [true, "Brand is required"],
    },
    basePrice: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      default: null,
    },
    images: {
      type: [String],
      required: [true, "At least one image is required"],
      validate: [(arr) => arr.length > 0, "At least one image is required"],
    },
    sizes: {
      type: [sizeStockSchema],
      required: [true, "Sizes are required"],
      validate: [(arr) => arr.length > 0, "At least one size is required"],
    },
    gender: {
      type: String,
      enum: ["men", "women", "kids", "unisex"],
      required: [true, "Gender target is required"],
    },
    color: {
      type: String,
      default: "",
    },
    material: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Virtual: total stock across all sizes
productSchema.virtual("totalStock").get(function () {
  return this.sizes.reduce((sum, s) => sum + s.stock, 0);
});

// Index for search and filtering
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, brand: 1, gender: 1 });
productSchema.index({ basePrice: 1 });

// Auto-generate slug from name
productSchema.pre("validate", function (next) {
  if (this.isModified("name") || !this.slug) {
    const base = slugify(this.name, { lower: true, strict: true });
    // Append short id tail to guarantee uniqueness
    this.slug = `${base}-${this._id.toString().slice(-6)}`;
  }
  next();
});

const productModel = mongoose.model("products", productSchema);
export default productModel;
