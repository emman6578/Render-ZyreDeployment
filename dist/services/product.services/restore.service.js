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
Object.defineProperty(exports, "__esModule", { value: true });
exports.restore_products = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const restore_products = (id, reason, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!id || isNaN(id)) {
        throw new Error("Valid product ID is required");
    }
    const existingProduct = yield prisma.product.findUnique({
        where: { id },
    });
    if (!existingProduct) {
        throw new Error("Product not found");
    }
    if (existingProduct.isActive) {
        throw new Error("Product is already active");
    }
    const restoredProduct = yield prisma.product.update({
        where: { id },
        data: {
            isActive: true,
            updatedById: userId,
            lastUpdateReason: reason || "Product reactivated",
        },
        include: {
            generic: true,
            brand: true,
            categories: { select: { name: true } },
            company: true,
            updatedBy: {
                select: { id: true, fullname: true, email: true },
            },
        },
    });
    return restoredProduct;
});
exports.restore_products = restore_products;
