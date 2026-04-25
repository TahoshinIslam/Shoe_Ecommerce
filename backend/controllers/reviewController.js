import asyncHandler from "../middleware/asyncHandler.js";
import Review from "../models/reviewModel.js";
import Order from "../models/orderModel.js";

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const filter = { product: req.params.productId };
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("user", "name avatar")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Review.countDocuments(filter),
  ]);
  res.json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    count: reviews.length,
    reviews,
  });
});

// @desc    Create review — only if user has a DELIVERED order for this product
// @route   POST /api/reviews/product/:productId
// @access  Private
export const createReview = asyncHandler(async (req, res) => {
  const { rating, title, comment, images = [] } = req.body;
  const productId = req.params.productId;

  // Hard block: must have an order with status "delivered" containing this product.
  const hasDelivered = await Order.exists({
    user: req.user._id,
    "items.product": productId,
    status: "delivered",
  });
  if (!hasDelivered) {
    res.status(403);
    throw new Error("You can only review products from delivered orders");
  }

  try {
    const review = await Review.create({
      user: req.user._id,
      product: productId,
      rating,
      title,
      comment,
      images,
      isVerifiedPurchase: true, // guaranteed true now since we blocked above
    });
    res.status(201).json({ success: true, review });
  } catch (err) {
    // Unique index on {user, product} throws E11000 on duplicate
    if (err.code === 11000) {
      res.status(400);
      throw new Error("You've already reviewed this product");
    }
    throw err;
  }
});

// @desc    Update my review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }
  if (review.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }
  const { rating, title, comment, images } = req.body;
  if (rating !== undefined) review.rating = rating;
  if (title !== undefined) review.title = title;
  if (comment !== undefined) review.comment = comment;
  if (images !== undefined) review.images = images;
  await review.save();
  res.json({ success: true, review });
});

// @desc    Delete review (owner or admin)
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }
  if (
    review.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized");
  }
  await review.deleteOne();
  res.json({ success: true, message: "Review deleted" });
});

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
export const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $inc: { helpfulCount: 1 } },
    { new: true },
  );
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }
  res.json({ success: true, helpfulCount: review.helpfulCount });
});
