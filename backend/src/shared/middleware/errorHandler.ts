import { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../errors/AppError";

type ErrorResponse = {
  success: false;
  message: string;
  statusCode: number;
  errors?: any[];
  stack?: string;
  path?: string;
  timestamp?: string;
};

const isDev = process.env.NODE_ENV === "development";

const sendError = (
  res: Response,
  req: Request,
  statusCode: number,
  message: string,
  errors?: any[],
  stack?: string,
) => {
  const response: ErrorResponse = {
    success: false,
    message,
    statusCode,
    path: req.path,
    timestamp: new Date().toISOString(),
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  if (isDev && stack) {
    response.stack = stack;
  }

  return res.status(statusCode).json(response);
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const error = err as any;

  // 1) App-level operational errors
  if (error instanceof AppError) {
    const validationErrors =
      error instanceof ValidationError && Array.isArray(error.errors)
        ? error.errors
        : undefined;

    return sendError(
      res,
      req,
      error.statusCode,
      error.message,
      validationErrors,
      error.stack,
    );
  }

  // 2) Body parser / invalid JSON
  if (error instanceof SyntaxError && "body" in error) {
    return sendError(
      res,
      req,
      400,
      "Invalid JSON payload",
      undefined,
      error.stack,
    );
  }

  // 3) JWT errors
  if (error?.name === "JsonWebTokenError") {
    return sendError(res, req, 401, "Invalid token", undefined, error.stack);
  }

  if (error?.name === "TokenExpiredError") {
    return sendError(res, req, 401, "Token expired", undefined, error.stack);
  }

  // 4) Prisma known request errors
  if (error?.name === "PrismaClientKnownRequestError") {
    const code = error?.code as string | undefined;

    if (code === "P2002") {
      return sendError(
        res,
        req,
        409,
        "A record with this unique field already exists",
        undefined,
        error.stack,
      );
    }

    if (code === "P2003") {
      return sendError(
        res,
        req,
        400,
        "Invalid reference to related record",
        undefined,
        error.stack,
      );
    }

    if (code === "P2025") {
      return sendError(
        res,
        req,
        404,
        "Record not found",
        undefined,
        error.stack,
      );
    }

    return sendError(
      res,
      req,
      400,
      "Database request error",
      undefined,
      error.stack,
    );
  }

  // 5) Prisma validation error
  if (error?.name === "PrismaClientValidationError") {
    return sendError(
      res,
      req,
      422,
      "Database validation error",
      undefined,
      error.stack,
    );
  }

  // 6) Unknown/unhandled
  console.error("Unhandled error:", err);

  return sendError(
    res,
    req,
    500,
    isDev ? error?.message || "Internal server error" : "Internal server error",
    undefined,
    error?.stack,
  );
};
