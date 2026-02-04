import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import { AppError } from "./errorHandler.middleware.js";

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // First try to get token from cookie, then from Authorization header
    let token = req.cookies?.authToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      throw new AppError("Unauthorized - No token provided", 401);
    }

    const payload = verifyToken(token);

    // Set user object on request for use in controllers
    req.user = {
      id: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError("Unauthorized - Invalid token", 401));
  }
};
