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
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
exports.authenticateToken = (0, express_async_handler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Get token from HTTP-only cookie instead of Authorization header
    const token = req.cookies.auth_token;
    if (!token) {
        throw new Error("Authentication failed: No token provided: UNAUTHORIZED");
    }
    // Decode JWT token
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Verify session exists and is valid
        const session = yield prisma.session.findUnique({
            where: { id: payload.sessionId },
            include: {
                user: {
                    include: {
                        role: true,
                        stores: true,
                        position: true,
                    },
                },
            },
        });
        if (!session || session.expires < new Date()) {
            // Clear the invalid cookie
            res.clearCookie("auth_token", {
                httpOnly: true,
                path: "/",
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            });
            throw new Error("Session expired or invalid: SESSION_EXPIRED");
        }
        // Attach user to request with formatted data
        req.user = session.user;
        req.user.roleName = session.user.role.name;
        req.user.storeNames = session.user.stores.map((store) => store.name);
        req.user.positionName = (_a = session.user.position) === null || _a === void 0 ? void 0 : _a.name;
        req.sessionId = payload.sessionId; // CSRF middleware needs this
        req.userId = payload.userId; // Useful for other purposes
        next();
    }
    catch (error) {
        console.error("JWT verification error:", error); // Debug log
        // Clear the invalid cookie
        res.clearCookie("auth_token", {
            httpOnly: true,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });
        res.clearCookie("csrf_token", {
            httpOnly: true,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });
        throw new Error("Unauthorized: Invalid token: INVALID_TOKEN");
    }
}));
