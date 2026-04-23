import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "products",
      required: [true, "Product is required"],
    },
    name: {
      // snapshot at purchase time
      type: String,
      required: true,
    },
    image: {
      // snapshot at purchase time
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: [true, "Size is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    price: {
      // snapshot of price at purchase time
      type: Number,
      required: [true, "Price is required"],
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "User is required"],
    },
    items: {
      type: [orderItemSchema],
      required: [true, "Order must have items"],
      validate: [(arr) => arr.length > 0, "Order must have at least one item"],
    },
    shippingAddress: {
      // snapshot of address at purchase time
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, default: "" },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "coupons",
      default: null,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending", // order placed, awaiting payment
        "paid", // payment confirmed
        "processing", // being prepared/packed
        "shipped", // handed to courier
        "delivered", // received by customer
        "cancelled", // cancelled before shipment
        "refunded", // refund issued
      ],
      default: "pending",
    },
    trackingNumber: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    deliveredAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Index for user order history and status filters
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

const orderModel = mongoose.model("orders", orderSchema);
export default orderModel;
