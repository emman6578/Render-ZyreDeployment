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
exports.create_products_bulk = void 0;
const client_1 = require("@prisma/client");
const validateForeignKeys_1 = require("./validateForeignKeys");
const prisma = new client_1.PrismaClient();
// Validation function that can be reused
const validateProductData = (data) => __awaiter(void 0, void 0, void 0, function* () {
    // Basic input validation checkers
    // 1. Check for required fields presence
    if (!data.genericId ||
        !data.brandId ||
        !data.categoryIds ||
        !Array.isArray(data.categoryIds) ||
        data.categoryIds.length === 0 ||
        !data.companyId ||
        data.safetyStock === undefined ||
        data.averageCostPrice === undefined ||
        data.averageRetailPrice === undefined ||
        !data.createdById) {
        throw new Error("All required fields must be provided: genericId, brandId, categoryIds (array), companyId, safetyStock, averageCostPrice, averageRetailPrice, createdById");
    }
    // 2. Check for valid numeric values (not NaN)
    if (isNaN(data.genericId) ||
        isNaN(data.brandId) ||
        data.categoryIds.some((id) => isNaN(id)) ||
        isNaN(data.companyId) ||
        isNaN(data.safetyStock) ||
        isNaN(data.averageCostPrice) ||
        isNaN(data.averageRetailPrice) ||
        isNaN(data.createdById)) {
        throw new Error("All numeric fields must be valid numbers");
    }
    // 3. Check for positive ID values
    if (data.genericId <= 0 ||
        data.brandId <= 0 ||
        data.categoryIds.some((id) => id <= 0) ||
        data.companyId <= 0 ||
        data.createdById <= 0) {
        throw new Error("All ID fields must be positive integers");
    }
    // 4. Check stock quantity is non-negative
    if (data.safetyStock < 0) {
        throw new Error("Stock quantity cannot be negative");
    }
    // 5. Check price values are non-negative
    if (data.averageCostPrice < 0 || data.averageRetailPrice < 0) {
        throw new Error("Prices cannot be negative");
    }
    // 6. Check retail price is not less than cost price
    if (data.averageRetailPrice < data.averageCostPrice) {
        throw new Error("Retail price cannot be less than cost price");
    }
    // 7. Check for reasonable price limits (business logic)
    const maxPrice = 1000000;
    if (data.averageCostPrice > maxPrice || data.averageRetailPrice > maxPrice) {
        throw new Error(`Prices cannot exceed ${maxPrice}`);
    }
    // 8. Check image path format if provided
    if (data.image && data.image.trim() !== "") {
        const trimmedImage = data.image.trim();
        // Check if it's a valid URL or relative path
        const urlPattern = /^(https?:\/\/|\/)/;
        if (!urlPattern.test(trimmedImage)) {
            throw new Error("Image must be a valid URL or relative path starting with '/'");
        }
    }
    // 9. Check lastUpdateReason length if provided
    if (data.lastUpdateReason && data.lastUpdateReason.length > 500) {
        throw new Error("Last update reason cannot exceed 500 characters");
    }
    // 10. Check for duplicate category IDs within the same product
    const uniqueCategoryIds = [...new Set(data.categoryIds)];
    if (uniqueCategoryIds.length !== data.categoryIds.length) {
        throw new Error("Duplicate category IDs found for the same product");
    }
    // 11. Check for duplicate product (same generic + brand + company combination)
    const existingProducts = yield prisma.product.findMany({
        where: {
            genericId: data.genericId,
            brandId: data.brandId,
            companyId: data.companyId,
        },
        include: {
            categories: {
                select: {
                    id: true,
                },
            },
        },
    });
    if (existingProducts.length > 0) {
        // Sort the new category IDs for comparison
        const newCategoryIds = [...data.categoryIds].sort();
        // Check if any existing product has the exact same categories
        for (const existingProduct of existingProducts) {
            const existingCategoryIds = existingProduct.categories
                .map((c) => c.id)
                .sort();
            // Compare if category arrays are identical
            if (JSON.stringify(existingCategoryIds) === JSON.stringify(newCategoryIds)) {
                throw new Error("Product with the same generic, brand, company, and categories combination already exists");
            }
        }
    }
    // 12. Validate foreign key references exist (including categories)
    yield (0, validateForeignKeys_1.validateForeignKeys)(data.genericId, data.brandId, data.categoryIds, // Pass array of category IDs
    data.companyId);
});
// New bulk creation function
const create_products_bulk = (dataArray) => __awaiter(void 0, void 0, void 0, function* () {
    // First, validate all items without creating anything
    for (let i = 0; i < dataArray.length; i++) {
        try {
            yield validateProductData(dataArray[i]);
        }
        catch (error) {
            throw new Error(`Validation failed for item ${i + 1}: ${error.message}`);
        }
    }
    // Check for duplicates within the array itself
    const combinations = new Set();
    for (let i = 0; i < dataArray.length; i++) {
        const combination = `${dataArray[i].genericId}-${dataArray[i].brandId}-${dataArray[i].companyId}`;
        if (combinations.has(combination)) {
            throw new Error(`Duplicate combination found within the array at item ${i + 1}: generic ${dataArray[i].genericId}, brand ${dataArray[i].brandId}, company ${dataArray[i].companyId}`);
        }
        combinations.add(combination);
    }
    // If all validations pass, create all products in a transaction
    return yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const createdProducts = [];
        for (const data of dataArray) {
            // Create the product with many-to-many categories relationship
            const product = yield tx.product.create({
                data: {
                    image: ((_a = data.image) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                    genericId: data.genericId,
                    brandId: data.brandId,
                    companyId: data.companyId,
                    safetyStock: data.safetyStock,
                    averageCostPrice: data.averageCostPrice,
                    averageRetailPrice: data.averageRetailPrice,
                    createdById: data.createdById,
                    lastUpdateReason: ((_b = data.lastUpdateReason) === null || _b === void 0 ? void 0 : _b.trim()) || "Initial product creation",
                    // Connect multiple categories using many-to-many relationship
                    categories: {
                        connect: data.categoryIds.map((id) => ({ id })),
                    },
                },
                include: {
                    generic: true,
                    brand: true,
                    categories: true, // Include related categories
                    company: true,
                    createdBy: {
                        select: { id: true, fullname: true, email: true },
                    },
                },
            });
            // Create initial price history entry
            yield tx.productPriceHistory.create({
                data: {
                    productId: product.id,
                    averageCostPrice: data.averageCostPrice,
                    averageRetailPrice: data.averageRetailPrice,
                    createdById: data.createdById,
                    reason: "Initial product pricing",
                },
            });
            yield tx.activityLog.create({
                data: {
                    userId: data.createdById,
                    model: "Product",
                    recordId: product.id,
                    action: client_1.ActionType.CREATE,
                    description: `Created product ID ${product.id} (generic=${product.generic.name}, brand=${product.brand.name})`,
                    ipAddress: null,
                    userAgent: null,
                },
            });
            createdProducts.push(product);
        }
        return createdProducts;
    }));
});
exports.create_products_bulk = create_products_bulk;
