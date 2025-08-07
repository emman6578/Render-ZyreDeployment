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
exports.update_products = void 0;
const client_1 = require("@prisma/client");
const validateForeignKeys_1 = require("./validateForeignKeys");
const prisma = new client_1.PrismaClient();
// Helper function to check for duplicate products
const checkForDuplicateProduct = (id, genericId, brandId, categoryIds, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    // Only check for duplicates if key identifying fields are being updated
    if (!genericId && !brandId && !categoryIds && !companyId) {
        return; // No key fields being updated, skip duplicate check
    }
    // Get current product data to use as fallback for undefined values
    const currentProduct = yield prisma.product.findUnique({
        where: { id },
        select: {
            genericId: true,
            brandId: true,
            categories: { select: { id: true } },
            companyId: true,
        },
    });
    if (!currentProduct) {
        throw new Error("Product not found");
    }
    // Use provided values or fall back to current values
    const finalGenericId = genericId !== null && genericId !== void 0 ? genericId : currentProduct.genericId;
    const finalBrandId = brandId !== null && brandId !== void 0 ? brandId : currentProduct.brandId;
    const finalCompanyId = companyId !== null && companyId !== void 0 ? companyId : currentProduct.companyId;
    const finalCategoryIds = categoryIds !== null && categoryIds !== void 0 ? categoryIds : currentProduct.categories.map((c) => c.id);
    // Check for existing product with the same combination (excluding current product)
    const duplicateProduct = yield prisma.product.findFirst({
        where: {
            AND: [
                { id: { not: id } }, // Exclude current product
                { genericId: finalGenericId },
                { brandId: finalBrandId },
                { companyId: finalCompanyId },
                {
                    categories: {
                        every: {
                            id: {
                                in: finalCategoryIds,
                            },
                        },
                    },
                },
            ],
        },
        include: {
            generic: { select: { name: true } },
            brand: { select: { name: true } },
            categories: { select: { name: true } },
            company: { select: { name: true } },
        },
    });
    if (duplicateProduct) {
        const categoryNames = duplicateProduct.categories
            .map((c) => c.name)
            .join(", ");
        throw new Error(`A product with the same combination already exists: ${(_a = duplicateProduct.generic) === null || _a === void 0 ? void 0 : _a.name} - ${(_b = duplicateProduct.brand) === null || _b === void 0 ? void 0 : _b.name} - ${categoryNames} - ${(_c = duplicateProduct.company) === null || _c === void 0 ? void 0 : _c.name}`);
    }
});
const update_products = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    if (!id || isNaN(id)) {
        throw new Error("Valid product ID is required");
    }
    // Check if product exists
    const existingProduct = yield prisma.product.findUnique({
        where: { id },
        include: {
            categories: true,
        },
    });
    if (!existingProduct) {
        throw new Error("Product not found");
    }
    // Validate foreign key references if provided
    yield (0, validateForeignKeys_1.validateForeignKeys)(data.genericId, data.brandId, data.categoryIds, // Updated to handle array
    data.companyId);
    // Check for duplicate products before updating
    yield checkForDuplicateProduct(id, data.genericId, data.brandId, data.categoryIds, data.companyId);
    // Validate price changes
    const updateData = {
        updatedById: data.updatedById,
        lastUpdateReason: data.lastUpdateReason || "Product information updated",
    };
    if (data.image !== undefined)
        updateData.image = data.image;
    if (data.genericId)
        updateData.genericId = data.genericId;
    if (data.brandId)
        updateData.brandId = data.brandId;
    if (data.companyId)
        updateData.companyId = data.companyId;
    // Handle price updates
    let priceChanged = false;
    if (data.averageCostPrice !== undefined) {
        if (data.averageCostPrice < 0)
            throw new Error("Cost price cannot be negative");
        if (data.averageCostPrice !== existingProduct.averageCostPrice.toNumber()) {
            updateData.averageCostPrice = data.averageCostPrice;
            priceChanged = true;
        }
    }
    if (data.averageRetailPrice !== undefined) {
        if (data.averageRetailPrice < 0)
            throw new Error("Retail price cannot be negative");
        if (data.averageRetailPrice !== existingProduct.averageRetailPrice.toNumber()) {
            updateData.averageRetailPrice = data.averageRetailPrice;
            priceChanged = true;
        }
    }
    // Validate retail price is not less than cost price
    const finalCostPrice = updateData.averageCostPrice || existingProduct.averageCostPrice.toNumber();
    const finalRetailPrice = updateData.averageRetailPrice ||
        existingProduct.averageRetailPrice.toNumber();
    if (finalRetailPrice < finalCostPrice) {
        throw new Error("Retail price cannot be less than cost price");
    }
    // Start transaction for product update and category relations
    const updatedProduct = yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
        // Update product basic info
        const product = yield prisma.product.update({
            where: { id },
            data: updateData,
        });
        // Handle category updates if provided
        if (data.categoryIds) {
            // First, disconnect all existing categories
            yield prisma.product.update({
                where: { id },
                data: {
                    categories: {
                        set: [],
                    },
                },
            });
            // Then connect the new categories
            yield prisma.product.update({
                where: { id },
                data: {
                    categories: {
                        connect: data.categoryIds.map((id) => ({ id })),
                    },
                },
            });
        }
        // Return the updated product with relations
        return yield prisma.product.findUnique({
            where: { id },
            include: {
                generic: true,
                brand: true,
                categories: true,
                company: true,
                updatedBy: {
                    select: { id: true, fullname: true, email: true },
                },
            },
        });
    }));
    // Create price history entry if prices changed
    if (priceChanged) {
        yield prisma.productPriceHistory.create({
            data: {
                productId: updatedProduct.id,
                averageCostPrice: finalCostPrice,
                averageRetailPrice: finalRetailPrice,
                previousCostPrice: existingProduct.averageCostPrice,
                previousRetailPrice: existingProduct.averageRetailPrice,
                createdById: data.updatedById,
                reason: data.lastUpdateReason || "Price update",
            },
        });
    }
    return updatedProduct;
});
exports.update_products = update_products;
