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
exports.loginUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const isEmailValid_1 = require("@services/auth.services/validator/isEmailValid");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_EXPIRATION_DAYS = 14; // 2 weeks
const loginUser = (email, password) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate email input
    if (!email) {
        throw new Error("Empty email field");
    }
    if (!(0, isEmailValid_1.isValidEmail)(email)) {
        throw new Error("Invalid email format.");
    }
    // Find the user by email
    const user = yield prisma.user.findUnique({
        where: { email },
        include: {
            role: true,
            stores: true,
            position: true,
        },
    });
    if (!user) {
        throw new Error("Please register first.");
    }
    // Validate the password
    const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error("Invalid credentials: Wrong Password");
    }
    // Record lastLogin attempt
    yield prisma.user.update({
        where: { id: user.id },
        data: {
            lastLogin: new Date(),
            isEmailVerified: true, // Auto verify email on successful login
        },
    });
    // Generate session token expiration
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + SESSION_EXPIRATION_DAYS);
    // Create session record
    const session = yield prisma.session.create({
        data: {
            token: crypto_1.default.randomUUID(),
            expires: expirationDate,
            userId: user.id,
            userAgent: "API Login", // This should come from request headers in a real app
            ipAddress: "0.0.0.0", // This should come from request in a real app
        },
    });
    // Create JWT token with session ID that will be stored in HTTP-only cookie
    const jwtToken = jsonwebtoken_1.default.sign({
        sessionId: session.id,
        userId: user.id,
        role: user.role.name,
    }, JWT_SECRET, { expiresIn: `${SESSION_EXPIRATION_DAYS}d` });
    // Format user data according to requirements
    const formattedUser = {
        id: user.id,
        name: user.fullname,
        role: user.role.name.toLowerCase(),
        store: user.stores.map((store) => store.name.toUpperCase()),
        position: user.position
            ? user.position.name.toLowerCase().replace("_", "-")
            : null,
    };
    return {
        token: jwtToken,
        user: formattedUser,
        expires: expirationDate,
        sessionId: session.id,
    };
});
exports.loginUser = loginUser;
