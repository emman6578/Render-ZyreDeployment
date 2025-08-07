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
exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const isEmailValid_1 = require("@services/auth.services/validator/isEmailValid");
const prisma = new client_1.PrismaClient();
const registerUser = (userData) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userData.fullname ||
        !userData.email ||
        !userData.password ||
        !userData.roleId) {
        throw new Error("All fields are required.");
    }
    // Validate email
    if (!(0, isEmailValid_1.isValidEmail)(userData.email)) {
        throw new Error("Invalid email format.");
    }
    // Validate password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(userData.password)) {
        throw new Error("Password must be at least 8 characters long and include uppercase, lowercase, a number, and a symbol.");
    }
    // Check if the role exists
    const role = yield prisma.role.findUnique({
        where: { id: userData.roleId },
    });
    if (!role) {
        throw new Error("Invalid role ID.");
    }
    // Check if user with email already exists
    const existingUser = yield prisma.user.findUnique({
        where: { email: userData.email },
    });
    if (existingUser) {
        throw new Error("User with this email already exists.");
    }
    // Hash the password
    const hashedPassword = yield bcrypt_1.default.hash(userData.password, 10);
    // Create the user
    const newUser = yield prisma.user.create({
        data: {
            fullname: userData.fullname,
            email: userData.email,
            password: hashedPassword,
            roleId: userData.roleId,
            isEmailVerified: false,
        },
        select: {
            id: true,
            fullname: true,
            email: true,
            role: {
                select: {
                    name: true,
                },
            },
            created: true,
        },
    });
    return newUser;
});
exports.registerUser = registerUser;
