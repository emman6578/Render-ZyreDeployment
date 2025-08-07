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
exports.validateForeignKeys = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const validateForeignKeys = (genericId, brandId, categoryIds, // Updated to handle both array and single number
companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const validationPromises = [];
    const labels = [];
    if (genericId) {
        validationPromises.push(prisma.generic.findUnique({ where: { id: genericId } }));
        labels.push("Generic");
    }
    if (brandId) {
        validationPromises.push(prisma.brand.findUnique({ where: { id: brandId } }));
        labels.push("Brand");
    }
    // Handle both single category ID and array of category IDs
    if (categoryIds) {
        if (Array.isArray(categoryIds)) {
            // Handle array of category IDs
            if (categoryIds.length > 0) {
                validationPromises.push(prisma.category.findMany({
                    where: {
                        id: {
                            in: categoryIds,
                        },
                    },
                }));
                labels.push("Categories");
            }
        }
        else {
            // Handle single category ID (backward compatibility)
            validationPromises.push(prisma.category.findUnique({ where: { id: categoryIds } }));
            labels.push("Category");
        }
    }
    if (companyId) {
        validationPromises.push(prisma.company.findUnique({ where: { id: companyId } }));
        labels.push("Company");
    }
    if (validationPromises.length > 0) {
        const results = yield Promise.all(validationPromises);
        results.forEach((result, index) => {
            const label = labels[index];
            if (label === "Categories") {
                // Special handling for category array validation
                const categories = result;
                const expectedCategoryIds = Array.isArray(categoryIds)
                    ? categoryIds
                    : [];
                if (categories.length !== expectedCategoryIds.length) {
                    const foundCategoryIds = categories.map((cat) => cat.id);
                    const missingCategoryIds = expectedCategoryIds.filter((id) => !foundCategoryIds.includes(id));
                    throw new Error(`Category(ies) with ID(s) ${missingCategoryIds.join(", ")} not found`);
                }
            }
            else {
                // Standard validation for single entities
                if (!result) {
                    throw new Error(`${label} not found`);
                }
            }
        });
    }
});
exports.validateForeignKeys = validateForeignKeys;
