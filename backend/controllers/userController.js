import crypto from "crypto";
import asyncHandler from "../middleware/asyncHandler.js";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import { sendEmail, buildVerificationEmail, buildPasswordResetEmail } from "../utils/sendEmail.js";

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error("Email already registered");
  }

  const user = await User.create({ name, email, password });

  // email verification token (stored hashed)
  const rawToken = crypto.randomBytes(32).toString("hex");
  user.verificationToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${rawToken}`;
  try {
    const tpl = buildVerificationEmail(user.name, verifyUrl);
    await sendEmail({ to: user.email, ...tpl });
  } catch (err) {
    console.warn("⚠️  Verification email not sent:", err.message);
  }

  generateToken(res, user._id);

  res.status(201).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  });
});

// @desc    Verify email
// @route   GET /api/users/verify-email/:token
// @access  Public
export const verifyEmail = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await User.findOne({ verificationToken: hashed }).select("+verificationToken");

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired verification link");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: "Email verified" });
});

// @desc    Login
// @route   POST /api/users/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select(
    "+password +loginAttempts +lockUntil",
  );

  if (!user) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  if (user.isLocked) {
    res.status(423);
    throw new Error("Account temporarily locked due to too many failed attempts. Try again in 15 minutes.");
  }

  const ok = await user.matchPassword(password);
  if (!ok) {
    await user.incLoginAttempts();
    res.status(401);
    throw new Error("Invalid credentials");
  }

  await user.resetLoginAttempts();
  generateToken(res, user._id);

  res.json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
    },
  });
});

// @desc    Logout (clear cookie)
// @route   POST /api/users/logout
// @access  Private
export const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ success: true, message: "Logged out" });
});

// @desc    Get current user
// @route   GET /api/users/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// @desc    Update current user profile
// @route   PUT /api/users/me
// @access  Private
export const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, email, phone, avatar, currentPassword, newPassword } = req.body;
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;

  if (newPassword) {
    if (!currentPassword) {
      res.status(400);
      throw new Error("Current password required to set new password");
    }
    const ok = await user.matchPassword(currentPassword);
    if (!ok) {
      res.status(400);
      throw new Error("Current password is incorrect");
    }
    user.password = newPassword;
  }

  await user.save();

  res.json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
    },
  });
});

// @desc    Request password reset
// @route   POST /api/users/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always respond success to avoid leaking existence
  if (!user) {
    return res.json({ success: true, message: "If that email exists, a link has been sent." });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
  try {
    const tpl = buildPasswordResetEmail(user.name, resetUrl);
    await sendEmail({ to: user.email, ...tpl });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500);
    throw new Error("Email could not be sent");
  }

  res.json({ success: true, message: "If that email exists, a link has been sent." });
});

// @desc    Reset password
// @route   POST /api/users/reset-password/:token
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset link");
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ success: true, message: "Password updated. Please log in." });
});

// ======= ADMIN =======

// @desc    Get all users
// @route   GET /api/users
// @access  Admin
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort("-createdAt");
  res.json({ success: true, count: users.length, users });
});

// @desc    Get user by id
// @route   GET /api/users/:id
// @access  Admin
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json({ success: true, user });
});

// @desc    Update user (admin can change role)
// @route   PUT /api/users/:id
// @access  Admin
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, email, role, isVerified } = req.body;
  if (name) user.name = name;
  if (email) user.email = email;
  if (role && ["customer", "admin"].includes(role)) user.role = role;
  if (isVerified !== undefined) user.isVerified = isVerified;

  await user.save();
  res.json({ success: true, user });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (user.role === "admin") {
    res.status(400);
    throw new Error("Cannot delete an admin user");
  }
  await user.deleteOne();
  res.json({ success: true, message: "User deleted" });
});
