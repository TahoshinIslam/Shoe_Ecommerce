import request from "supertest";
import app from "../app.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";
import Brand from "../models/brandModel.js";
import Order from "../models/orderModel.js";

export const getJwtCookie = (res) => {
  const setCookie = res.headers["set-cookie"] || [];
  return setCookie.find((c) => c.startsWith("jwt=")) || "";
};

export const getCsrfCookie = (res) => {
  const setCookie = res.headers["set-cookie"] || [];
  return setCookie.find((c) => c.includes("x-csrf-token")) || "";
};

// Unique suffix for generated names — keeps parallel-ish tests from clashing
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const createUser = async (overrides = {}) => {
  const user = await User.create({
    name: overrides.name || "Test User",
    email: overrides.email || `test+${uniq()}@example.com`,
    password: overrides.password || "Password123!",
    role: overrides.role || "customer",
    isVerified: overrides.isVerified ?? true,
    ...overrides,
  });
  return user;
};

export const loginAs = async (email, password = "Password123!") => {
  const res = await request(app)
    .post("/api/users/login")
    .send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const cookies = res.headers["set-cookie"] || [];
  return { user: res.body.user, cookies };
};

export const getCsrfPair = async (cookies = []) => {
  const res = await request(app).get("/api/csrf-token").set("Cookie", cookies);
  const csrfCookie = getCsrfCookie(res);
  const allCookies = [...cookies, csrfCookie].filter(Boolean);
  return { token: res.body.csrfToken, cookies: allCookies };
};

export const authedRequest = async (user, password = "Password123!") => {
  const { cookies } = await loginAs(user.email, password);
  const { token, cookies: allCookies } = await getCsrfPair(cookies);
  const send = (method) => (url) => {
    const r = request(app)
      [method](url)
      .set("Cookie", allCookies)
      .set("X-CSRF-Token", token);
    return r;
  };
  return {
    cookies: allCookies,
    csrfToken: token,
    post: send("post"),
    put: send("put"),
    patch: send("patch"),
    delete: send("delete"),
    get: (url) => request(app).get(url).set("Cookie", allCookies),
  };
};

export const createCategory = (overrides = {}) => {
  const name = overrides.name || `TestCat-${uniq()}`;
  return Category.create({
    name,
    slug: overrides.slug || slugify(name),
    ...overrides,
  });
};

export const createBrand = (overrides = {}) => {
  const name = overrides.name || `TestBrand-${uniq()}`;
  return Brand.create({
    name,
    slug: overrides.slug || slugify(name),
    ...overrides,
  });
};

export const createProduct = async (overrides = {}) => {
  // Only create default category/brand if user didn't provide one
  const category = overrides.category || (await createCategory())._id;
  const brand = overrides.brand || (await createBrand())._id;

  return Product.create({
    name: overrides.name || `Test Product ${uniq()}`,
    description: overrides.description || "Test description",
    basePrice: overrides.basePrice ?? 100,
    category,
    brand,
    images: overrides.images || ["https://example.com/img.jpg"],
    sizes: overrides.sizes || [{ size: "42", stock: 10 }],
    gender: overrides.gender || "unisex",
    isActive: overrides.isActive ?? true,
    ...overrides,
    // re-apply category/brand AFTER spread so overrides.category doesn't
    // get re-overwritten by the spread (it already lives on overrides)
    category,
    brand,
  });
};

export const createDeliveredOrder = async (user, product, size = "42") =>
  Order.create({
    user: user._id,
    items: [
      {
        product: product._id,
        name: product.name,
        image: product.images[0],
        size,
        quantity: 1,
        price: product.basePrice,
      },
    ],
    shippingAddress: {
      fullName: "Test",
      phone: "123",
      street: "1 Test St",
      city: "Testville",
      postalCode: "00000",
      country: "BD",
    },
    subtotal: product.basePrice,
    shippingCost: 0,
    discount: 0,
    total: product.basePrice,
    status: "delivered",
    deliveredAt: new Date(),
  });
