"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successHandler = void 0;
const successHandler = (data, res, method, message) => {
    const successResponse = {
        success: true,
        method: method,
        message: message,
        data: data,
    };
    res.status(200).json(successResponse);
};
exports.successHandler = successHandler;
