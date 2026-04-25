import asyncHandler from "../middleware/asyncHandler.js";
import Product from "../models/productModel.js";

// Only these fields can be filtered on via query string.
// Anything else in ?foo=bar is silently ignored.
const ALLOWED_FILTER_FIELDS = new Set([
  "category",
  "brand",
  "gender",
  "color",
  "material",
  "isFeatured",
  "isActive",
  "basePrice",
]);

// Build a safe Mongo filter from whitelisted query keys only.
const buildFilter = (query, base = {}) => {
  const { search, featured } = query;
  const filter = {};

  if (search) filter.$text = { $search: String(search) };
  if (featured === "true" || featured === "1") filter.isFeatured = true;

  for (const [key, val] of Object.entries(query)) {
    if (!ALLOWED_FILTER_FIELDS.has(key)) continue;
    if (val === undefined || val === "") continue;

    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      const converted = {};
      for (const [op, v] of Object.entries(val)) {
        if (["gte", "gt", "lte", "lt"].includes(op) && v !== "") {
          const num = Number(v);
          converted[`$${op}`] = Number.isFinite(num) ? num : v;
        }
      }
      if (Object.keys(converted).length) filter[key] = converted;
    } else {
      filter[key] = val;
    }
  }

  // Apply base filter LAST so it cannot be overridden by a query param.
  // (e.g., a non-admin cannot set ?isActive=false to see inactive products.)
  Object.assign(filter, base);
  return filter;
};

// Whitelist of fields a product-create/update payload is allowed to set.
// Blocks things like rating, numReviews, slug, _id from being mass-assigned.
const PRODUCT_WRITABLE_FIELDS = [
  "name",
  "description",
  "category",
  "brand",
  "basePrice",
  "discountPrice",
  "images",
  "sizes",
  "gender",
  "color",
  "material",
  "tags",
  "isFeatured",
];

const pickWritable = (body) => {
  const out = {};
  for (const key of PRODUCT_WRITABLE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const baseFilter = req.user?.role === "admin" ? {} : { isActive: true };
  const filter = buildFilter(req.query, baseFilter);

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 12);
  const skip = (page - 1) * limit;

  const sortStr =
    req.query.sort && typeof req.query.sort === "string"
      ? req.query.sort.split(",").join(" ")
      : "-createdAt";
  const fieldsStr =
    req.query.fields && typeof req.query.fields === "string"
      ? req.query.fields.split(",").join(" ")
      : "-__v";

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortStr)
      .select(fieldsStr)
      .skip(skip)
      .limit(limit)
      .populate("brand", "name slug")
      .populate("category", "name slug"),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    count: products.length,
    products,
  });
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
export const getFeatured = asyncHandler(async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true })
    .sort("-rating")
    .limit(8)
    .populate("brand", "name")
    .populate("category", "name");
  res.json({ success: true, count: products.length, products });
});

// @desc    Get single product by id or slug
// @route   GET /api/products/:idOrSlug
// @access  Public
export const getProductByIdOrSlug = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const isId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);

  const product = await Product.findOne(
    isId ? { _id: idOrSlug } : { slug: idOrSlug },
  )
    .populate("brand", "name slug")
    .populate("category", "name slug");

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json({ success: true, product });
});

// @desc    Related products
// @route   GET /api/products/:id/related
// @access  Public
export const getRelated = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
    isActive: true,
  })
    .limit(8)
    .sort("-rating");
  res.json({ success: true, count: related.length, products: related });
});

// ========== ADMIN ==========

export const createProduct = asyncHandler(async (req, res) => {
  const safe = pickWritable(req.body);
  const product = await Product.create(safe);
  res.status(201).json({ success: true, product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  const safe = pickWritable(req.body);
  Object.assign(product, safe);
  await product.save();
  res.json({ success: true, product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  product.isActive = false;
  await product.save();
  res.json({ success: true, message: "Product deactivated" });
});
