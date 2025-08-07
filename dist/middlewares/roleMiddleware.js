"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const authorizeRoles = (allowedRoles) => (0, express_async_handler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Ensure that the user is attached from the auth middleware
    if (!req.user || !req.user.roleName) {
        throw new Error("User role not found or user not authenticated");
    }
    // If user is SUPERADMIN, always allow access
    if (req.user.roleName === "SUPERADMIN") {
        return next();
    }
    // Check if the user's role is included in the allowed roles
    if (!allowedRoles.includes(req.user.roleName)) {
        throw new Error("Access forbidden: Insufficient rights");
    }
    next();
}));
exports.authorizeRoles = authorizeRoles;
