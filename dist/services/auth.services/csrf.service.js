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
exports.isCSRFTokenValid = exports.createOrRefreshCsrfToken = exports.generateCsrfToken = exports.CSRF_TOKEN_EXPIRY = void 0;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.CSRF_TOKEN_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours
const generateCsrfToken = () => {
    return crypto_1.default.randomBytes(32).toString("hex");
};
exports.generateCsrfToken = generateCsrfToken;
const createOrRefreshCsrfToken = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    const newToken = (0, exports.generateCsrfToken)();
    const expiresAt = new Date(Date.now() + exports.CSRF_TOKEN_EXPIRY);
    yield prisma.session.update({
        where: { id: sessionId },
        data: {
            csrfToken: newToken,
            csrfTokenExpiresAt: expiresAt,
        },
    });
    return newToken;
});
exports.createOrRefreshCsrfToken = createOrRefreshCsrfToken;
const isCSRFTokenValid = (sessionId, clientToken) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield prisma.session.findUnique({
        where: { id: sessionId },
        select: {
            csrfToken: true,
            csrfTokenExpiresAt: true,
        },
    });
    if (!session || !session.csrfToken || !session.csrfTokenExpiresAt) {
        return false;
    }
    const now = new Date();
    const isTokenMatch = session.csrfToken === clientToken;
    const isNotExpired = now < session.csrfTokenExpiresAt;
    return isTokenMatch && isNotExpired;
});
exports.isCSRFTokenValid = isCSRFTokenValid;
