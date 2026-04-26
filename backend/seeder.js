import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";

import User from "./models/userModel.js";
import Brand from "./models/brandModel.js";
import Category from "./models/categoryModel.js";
import Product from "./models/productModel.js";
import Theme from "./models/themeModel.js";
import Coupon from "./models/couponModel.js";
import Order from "./models/orderModel.js";
import Cart from "./models/cartModel.js";
import Wishlist from "./models/wishlistModel.js";
import Review from "./models/reviewModel.js";
import Address from "./models/addressModel.js";
import Payment from "./models/paymentModel.js";

import rawProducts from "./data/products.js";

dotenv.config();

// ---- Helpers ----
const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ---- Seed data ----
const brandsSeed = [
  { name: "Nike", description: "Just do it." },
  { name: "Adidas", description: "Impossible is nothing." },
  { name: "Puma", description: "Forever faster." },
  { name: "New Balance", description: "Fearlessly independent." },
  { name: "Reebok", description: "Be more human." },
  { name: "Converse", description: "Made by you." },
];

const categoriesSeed = [
  { name: "Running", description: "Performance running shoes" },
  { name: "Sneakers", description: "Everyday casual sneakers" },
  { name: "Basketball", description: "On-court basketball shoes" },
  { name: "Lifestyle", description: "Fashion-forward lifestyle kicks" },
  { name: "Training", description: "Gym and training footwear" },
];

const usersSeed = [
  {
    name: "Admin",
    email: "admin@shoestore.com",
    password: "Admin@12345",
    role: "admin",
    isVerified: true,
  },
  {
    name: "Tahoshin",
    email: "tahoshin@example.com",
    password: "Tahoshin@123",
    role: "customer",
    isVerified: true,
  },
  {
    name: "Sadia Khan",
    email: "sadia@example.com",
    password: "Sadia@123",
    role: "customer",
    isVerified: true,
  },
];

const themesSeed = [
  {
    name: "Default",
    isActive: true,
    colors: {
      primary: "#0a0a0a",
      accent: "#f97316",
      background: "#ffffff",
      foreground: "#0a0a0a",
    },
  },
  {
    name: "Sunset Orange",
    colors: { primary: "#ea580c", accent: "#facc15", background: "#fef7ed" },
  },
  {
    name: "Ocean Blue",
    colors: { primary: "#0369a1", accent: "#06b6d4", background: "#f0f9ff" },
  },
  {
    name: "Forest Green",
    colors: { primary: "#166534", accent: "#84cc16", background: "#f7fee7" },
  },
  {
    name: "Royal Purple",
    colors: { primary: "#6d28d9", accent: "#ec4899", background: "#faf5ff" },
  },
];

const couponsSeed = [
  {
    code: "WELCOME10",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 50,
    maxDiscount: 30,
    usageLimit: 1000,
    perUserLimit: 1,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    isActive: true,
  },
  {
    code: "FREESHIP",
    discountType: "flat",
    discountValue: 10,
    minOrderAmount: 80,
    usageLimit: null,
    perUserLimit: 5,
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
];

// ---- Actions ----
const importData = async () => {
  await connectDB();
  try {
    console.log("🧹 Clearing existing data...");
    await Promise.all([
      User.deleteMany(),
      Brand.deleteMany(),
      Category.deleteMany(),
      Product.deleteMany(),
      Theme.deleteMany(),
      Coupon.deleteMany(),
      Order.deleteMany(),
      Cart.deleteMany(),
      Wishlist.deleteMany(),
      Review.deleteMany(),
      Address.deleteMany(),
      Payment.deleteMany(),
    ]);

    console.log("👤 Creating users...");
    // Create one-at-a-time so the pre-save bcrypt hook runs reliably
    const users = [];
    for (const u of usersSeed) {
      users.push(await User.create(u));
    }
    console.log(`   ✓ ${users.length} users`);

    console.log("🏷️  Creating brands...");
    const brands = await Brand.create(
      brandsSeed.map((b) => ({ ...b, slug: slugify(b.name) })),
    );
    const brandByName = Object.fromEntries(brands.map((b) => [b.name, b]));
    console.log(`   ✓ ${brands.length} brands`);

    console.log("📂 Creating categories...");
    const categories = await Category.create(
      categoriesSeed.map((c) => ({
        ...c,
        slug: slugify(c.name),
        isUserGenerated: false,
      })),
    );
    const categoryByName = Object.fromEntries(
      categories.map((c) => [c.name, c]),
    );
    console.log(`   ✓ ${categories.length} categories`);

    console.log("👟 Creating products...");
    // Map raw products → schema-shaped docs
    // Existing data has brand:"Nike" / category:"Shoes" (string)
    // We'll rotate through categories so we get a variety of products
    const catNames = [
      "Running",
      "Sneakers",
      "Lifestyle",
      "Training",
      "Basketball",
    ];
    const productDocs = rawProducts.map((p, idx) => {
      // Find matching brand, fallback to Nike
      const brand = brandByName[p.brand] || brandByName["Nike"];
      // Rotate through categories for variety
      const catName = catNames[idx % catNames.length];
      const category = categoryByName[catName];

      return {
        name: p.name,
        description: p.description,
        category: category._id,
        brand: brand._id,
        basePrice: p.price,
        discountPrice: p.discountPrice ?? null,
        // Use image as the first item in images array
        images: [p.image, ...(p.images || [])].filter(Boolean),
        sizes: p.sizes,
        gender: p.gender,
        color: p.color || "",
        material: p.material || "",
        tags: p.tags || [],
        rating: p.rating || 0,
        numReviews: p.numReviews || 0,
        isFeatured: !!p.isFeatured,
        isActive: p.isActive !== false,
      };
    });
    const products = await Product.create(productDocs);
    console.log(`   ✓ ${products.length} products`);

    console.log("🎨 Creating themes...");
    // create one at a time so the pre-save hook runs properly
    const themes = [];
    for (const t of themesSeed) {
      themes.push(await Theme.create({ ...t, updatedBy: users[0]._id }));
    }
    console.log(`   ✓ ${themes.length} themes (active: Default)`);

    console.log("🎟️  Creating coupons...");
    const coupons = await Coupon.create(couponsSeed);
    console.log(`   ✓ ${coupons.length} coupons`);

    console.log("\n✅ Data imported successfully!\n");
    console.log("   Admin login:    admin@shoestore.com / Admin@12345");
    console.log("   Customer login: tahoshin@example.com / Tahoshin@123");
    console.log(
      "   Coupons:        WELCOME10 (10% off, min $50) | FREESHIP ($10 off, min $80)\n",
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
};

const destroyData = async () => {
  await connectDB();
  try {
    console.log("🧹 Destroying all data...");
    await Promise.all([
      User.deleteMany(),
      Brand.deleteMany(),
      Category.deleteMany(),
      Product.deleteMany(),
      Theme.deleteMany(),
      Coupon.deleteMany(),
      Order.deleteMany(),
      Cart.deleteMany(),
      Wishlist.deleteMany(),
      Review.deleteMany(),
      Address.deleteMany(),
      Payment.deleteMany(),
    ]);
    console.log("✅ All data destroyed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Destroy error:", err);
    process.exit(1);
  }
};

// CLI: `npm run data:import` or `npm run data:destroy`
if (process.argv[2] === "-d") {
  destroyData();
} else {
  importData();
}
