import type { Request, Response, NextFunction } from "express";
import e from "express";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("====Error Handler====");
  console.error("Error: ", err);
  console.error("Method:", req.method);
  console.error("Path:", req.path);
  console.error("====End Error Handler====");

  let statusCode = 500;
  let message = "Internal Server Error";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = err.message;
  } else if (err.name === "UnauthorizedError") {
    statusCode = 401;
    message = "Unauthorized";
  } else if (err.name === "ForbiddenError") {
    statusCode = 403;
    message = "Forbidden";
  } else if (err.name === "NotFoundError") {
    statusCode = 404;
    message = "Not Found";
  } else {
    message = err.message;
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal Server Error" : message,
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.status(404).json({ message: "Route not found" });
};

export default errorHandler;
