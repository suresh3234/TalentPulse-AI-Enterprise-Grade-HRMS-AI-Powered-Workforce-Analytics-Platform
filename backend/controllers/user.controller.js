const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/user.model");
const RefreshToken = require("../models/refreshToken.model");
const generateToken = require("../utils/jwtToken");
const logger = require("../utils/logger");
const devopsService = require("../services/devops.service");

const registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const user = await User.create({ fullName, email, password });
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: userResponse,
    });
  } catch (error) {
    logger.error("User registration failed", { error: error.message });
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    logger.info("Login attempt", { email });

    const user = await User.findOne({ email });
    if (!user) {
      devopsService.recordSecurityEvent("FAILED_LOGIN", { email, reason: "User not found", ip: req.ip });
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      devopsService.recordSecurityEvent("FAILED_LOGIN", { email, reason: "Invalid password", ip: req.ip });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      logger.error("JWT secret missing during login");
      return res.status(500).json({ success: false, message: "Server misconfiguration" });
    }

    const token = generateToken(user._id);
    const userResponse = user.toObject();
    delete userResponse.password;

    // Generate refresh token
    const refreshTokenValue = crypto.randomBytes(40).toString("hex");
    await RefreshToken.create({
      userId: user._id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    res.cookie("refreshToken", refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user: userResponse, token, refreshToken: refreshTokenValue },
    });
  } catch (error) {
    logger.error("Login failed", { error: error.message });
    return res.status(500).json({ message: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const tokenVal = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!tokenVal) {
      return res.status(401).json({ success: false, message: "Refresh token is required" });
    }

    const storedToken = await RefreshToken.findOne({ token: tokenVal });
    if (!storedToken) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }

    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      return res.status(401).json({ success: false, message: "Refresh token expired" });
    }

    const user = await User.findById(storedToken.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    // Generate new access token
    const newAccessToken = generateToken(user._id);
    
    // Rotate refresh token
    const newRefreshTokenValue = crypto.randomBytes(40).toString("hex");
    await RefreshToken.deleteOne({ _id: storedToken._id });
    await RefreshToken.create({
      userId: user._id,
      token: newRefreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie("refreshToken", newRefreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token: newAccessToken,
        refreshToken: newRefreshTokenValue,
      },
    });
  } catch (error) {
    logger.error("Token refresh failed", { error: error.message });
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 200 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find({}, "fullName email role department isActive createdAt")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ fullName: 1 });
    const total = await User.countDocuments();

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error("Fetching users failed", { error: error.message });
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { registerUser, loginUser, refreshToken, getAllUsers };
