"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFound = void 0;
const notFound = (req, res, next) => {
    const error = new Error(`Not found: ${req.originalUrl}`);
    res.status(404);
    next(error);
};
exports.notFound = notFound;
const errorHandler = (err, // using any to allow custom properties like statusCode
req, res, next) => {
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
exports.errorHandler = errorHandler;
