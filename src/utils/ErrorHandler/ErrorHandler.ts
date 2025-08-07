import { Request, Response, NextFunction, ErrorRequestHandler } from "express";

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler: ErrorRequestHandler = (
  err: any, // using any to allow custom properties like statusCode
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use the error's statusCode if available, otherwise default to 500
  const statusCode = err.statusCode
    ? err.statusCode
    : res.statusCode === 200
    ? 500
    : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    status: statusCode,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
