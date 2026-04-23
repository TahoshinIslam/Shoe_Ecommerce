import asyncHandler from "../middleware/asyncHandler.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Coupon from "../models/couponModel.js";

// Recalculate totals server-side (never trust client totals)
const calcTotals = async (items, couponCode) => {
  let subtotal = 0;
  const lineItems = [];

  for (const it of items) {
    const product = await Product.findById(it.product);
    if (!product || !product.isActive) {
      throw Object.assign(new Error(`Product ${it.product} unavailable`), { status: 400 });
    }
    const sizeStock = product.sizes.find((s) => s.size === it.size);
    if (!sizeStock || sizeStock.stock < it.quantity) {
      throw Object.assign(
        new Error(`Insufficient stock for ${product.name} size ${it.size}`),
        { status: 400 },
      );
    }
    const price = product.discountPrice ?? product.basePrice;
    subtotal += price * it.quantity;
    lineItems.push({
      product: product._id,
      name: product.name,
      image: product.images[0] || "",
      size: it.size,
      quantity: it.quantity,
      price,
    });
  }

  let discount = 0;
  let couponDoc = null;
  if (couponCode) {
    couponDoc = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (!couponDoc) {
      throw Object.assign(new Error("Invalid coupon"), { status: 400 });
    }
    if (couponDoc.expiresAt && couponDoc.expiresAt < new Date()) {
      throw Object.assign(new Error("Coupon expired"), { status: 400 });
    }
    if (couponDoc.minOrderAmount && subtotal < couponDoc.minOrderAmount) {
      throw Object.assign(
        new Error(`Minimum order $${couponDoc.minOrderAmount} required`),
        { status: 400 },
      );
    }
    if (couponDoc.discountType === "percentage") {
      discount = Math.round((subtotal * couponDoc.discountValue) / 100);
    } else {
      discount = couponDoc.discountValue;
    }
    if (couponDoc.maxDiscount) {
      discount = Math.min(discount, couponDoc.maxDiscount);
    }
    couponDoc.usedCount += 1;
    await couponDoc.save();
  }

  const shippingCost = subtotal > 200 ? 0 : 10; // free shipping threshold
  const total = Math.max(0, subtotal + shippingCost - discount);

  return { lineItems, subtotal, shippingCost, discount, total, couponDoc };
};

// @desc    Create order
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, couponCode, notes } = req.body;

  if (!items?.length) {
    res.status(400);
    throw new Error("Order must contain items");
  }
  if (!shippingAddress) {
    res.status(400);
    throw new Error("Shipping address required");
  }

  const { lineItems, subtotal, shippingCost, discount, total, couponDoc } =
    await calcTotals(items, couponCode).catch((e) => {
      res.status(e.status || 400);
      throw e;
    });

  // Decrement stock
  for (const it of lineItems) {
    await Product.updateOne(
      { _id: it.product, "sizes.size": it.size },
      { $inc: { "sizes.$.stock": -it.quantity } },
    );
  }

  const order = await Order.create({
    user: req.user._id,
    items: lineItems,
    shippingAddress,
    coupon: couponDoc?._id || null,
    subtotal,
    shippingCost,
    discount,
    total,
    notes: notes || "",
    status: "pending",
  });

  res.status(201).json({ success: true, order });
});

// @desc    Get my orders
// @route   GET /api/orders/my
// @access  Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort("-createdAt");
  res.json({ success: true, count: orders.length, orders });
});

// @desc    Get order by id
// @route   GET /api/orders/:id
// @access  Private (owner or admin)
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  const isOwner = order.user._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }
  res.json({ success: true, order });
});

// @desc    Cancel order (only if pending/paid, not yet shipped)
// @route   POST /api/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (!["pending", "paid", "processing"].includes(order.status)) {
    res.status(400);
    throw new Error(`Cannot cancel an order in status "${order.status}"`);
  }

  // Restock
  for (const it of order.items) {
    await Product.updateOne(
      { _id: it.product, "sizes.size": it.size },
      { $inc: { "sizes.$.stock": it.quantity } },
    );
  }

  order.status = "cancelled";
  await order.save();
  res.json({ success: true, order });
});

// ========== ADMIN ==========

// @desc    Get all orders
// @route   GET /api/orders
// @access  Admin
export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};
  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(filter),
  ]);
  res.json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    count: orders.length,
    orders,
  });
});

// @desc    Update order status (admin)
// @route   PUT /api/orders/:id/status
// @access  Admin
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber } = req.body;
  const valid = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
  if (!valid.includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  order.status = status;
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (status === "delivered") order.deliveredAt = new Date();
  await order.save();
  res.json({ success: true, order });
});
