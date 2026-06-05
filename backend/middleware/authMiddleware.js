import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "./asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findByPk(decoded.id, {
    attributes: {
      exclude: ["password", "otpCode", "otpExpires"]
    }
  });

  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized, user not found");
  }

  next();
});

export const isPrivileged = (user) => user?.role === "owner" || user?.role === "admin";

export const owner = (req, res, next) => {
  if (req.user?.role === "owner") {
    next();
    return;
  }

  res.status(403);
  next(new Error("Owner access required"));
};

export const admin = (req, res, next) => {
  if (isPrivileged(req.user)) {
    next();
    return;
  }

  res.status(403);
  next(new Error("Admin access required"));
};
