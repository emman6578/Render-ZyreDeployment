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
exports.delete_products = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const delete_products = (id, reason, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!id || isNaN(id)) {
        throw new Error("Valid product ID is required");
    }
    const existingProduct = yield prisma.product.findUnique({
        where: { id },
        include: {
            inventoryItems: {
                where: { currentQuantity: { gt: 0 } },
            },
        },
    });
    if (!existingProduct) {
        throw new Error("Product not found");
    }
    if (!existingProduct.isActive) {
        throw new Error("Product is already deactivated");
    }
    // Check if product has active inventory
    if (existingProduct.inventoryItems.length > 0) {
        throw new Error("Cannot deactivate product with active inventory. Please clear inventory first.");
    }
    const deletedProduct = yield prisma.product.update({
        where: { id },
        data: {
            isActive: false,
            updatedById: userId,
            lastUpdateReason: reason || "Product deactivated",
        },
        include: {
            generic: true,
            brand: true,
            categories: { select: { name: true } },
            company: true,
        },
    });
    return deletedProduct;
});
exports.delete_products = delete_products;
