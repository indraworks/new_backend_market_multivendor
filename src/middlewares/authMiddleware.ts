// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

interface JwtPayload {
  id: number;
  email: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      state: "error",
      message: "Missing or invalid authorization header",
      data: null,
    });
  }
  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("❌ JWT_SECRET not set");
      return res
        .status(500)
        .json({ state: "error", message: "Server misconfig", data: null });
    }
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    console.error("JWT verify error:", err.message);
    return res
      .status(401)
      .json({
        state: "error",
        message: "Invalid or expired token",
        data: null,
      });
  }
};
