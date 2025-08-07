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
exports.validateCsrfToken = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const client_1 = require("@prisma/client");
const csrf_service_1 = require("@services/auth.services/csrf.service");
const prisma = new client_1.PrismaClient();
exports.validateCsrfToken = (0, express_async_handler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Skip CSRF for safe HTTP methods
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }
    const clientToken = req.header("X-CSRF-Token");
    if (!clientToken) {
        throw new Error("CSRF token required for this operation: CSRF_TOKEN_MISSING");
    }
    if (!req.sessionId) {
        throw new Error("Valid session required: SESSION_MISSING");
    }
    const isValid = yield (0, csrf_service_1.isCSRFTokenValid)(req.sessionId, clientToken);
    if (!isValid) {
        throw new Error("Invalid or expired CSRF token: CSRF_TOKEN_INVALID");
    }
    next();
}));
