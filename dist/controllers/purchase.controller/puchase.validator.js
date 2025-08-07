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
exports.validatePurchaseUpdateRequest = exports.PurchaseUpdateValidator = void 0;
// purchase.validator.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PurchaseUpdateValidator {
    /**
     * Main validation function for purchase update requests
     */
    static validatePurchaseUpdate(purchaseId, updateData, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Validate purchase ID
                if (!purchaseId || isNaN(purchaseId) || purchaseId <= 0) {
                    throw new Error(`Invalid purchase ID provided: ${purchaseId}`);
                }
                // 2. Validate user ID
                if (!userId || isNaN(userId) || userId <= 0) {
                    throw new Error(`Invalid user ID provided: ${userId}`);
                }
                // 3. Check if purchase exists
                const existingPurchase = yield prisma.purchase.findUnique({
                    where: { id: purchaseId },
                    include: { items: true },
                });
                if (!existingPurchase) {
                    throw new Error(`Purchase record not found: ${purchaseId}`);
                }
                // 4. Validate purchase-level fields
                this.validatePurchaseFields(updateData);
                // 5. Validate foreign key references
                yield this.validateForeignKeys(updateData);
                // 6. Validate items array
                if (updateData.items) {
                    yield this.validatePurchaseItems(updateData.items, existingPurchase.items);
                }
                // 7. Business logic validations
                yield this.validateBusinessRules(updateData, existingPurchase);
            }
            catch (error) {
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error(`Validation process failed: ${String(error)}`);
            }
        });
    }
    /**
     * Validate purchase-level fields
     */
    static validatePurchaseFields(updateData) {
        // Batch Number
        if (updateData.batchNumber !== undefined) {
            if (typeof updateData.batchNumber !== "string") {
                throw new Error("Batch number must be a string");
            }
            if (updateData.batchNumber.trim().length === 0) {
                throw new Error("Batch number cannot be empty");
            }
            if (updateData.batchNumber.length > 100) {
                throw new Error("Batch number cannot exceed 100 characters");
            }
        }
        // Invoice Number
        if (updateData.invoiceNumber !== undefined) {
            if (typeof updateData.invoiceNumber !== "string") {
                throw new Error("Invoice number must be a string");
            }
            if (updateData.invoiceNumber.trim().length === 0) {
                throw new Error("Invoice number cannot be empty");
            }
        }
        // Date validations
        this.validateDates(updateData);
        // Status validation
        if (updateData.status !== undefined) {
            const validStatuses = ["ACTIVE", "EXPIRED", "DAMAGED", "RETURNED"];
            if (!validStatuses.includes(updateData.status)) {
                throw new Error(`Status must be one of: ${validStatuses.join(", ")}`);
            }
        }
        // String field validations
        this.validateStringFields(updateData);
    }
    /**
     * Validate date fields
     */
    static validateDates(updateData) {
        const dateFields = [
            { field: "invoiceDate", value: updateData.invoiceDate },
            { field: "expiryDate", value: updateData.expiryDate },
            { field: "manufacturingDate", value: updateData.manufacturingDate },
            { field: "verificationDate", value: updateData.verificationDate },
        ];
        dateFields.forEach(({ field, value }) => {
            if (value !== undefined && value !== null) {
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    throw new Error(`Invalid date format for ${field}: ${value}`);
                }
            }
        });
        // Business date logic
        if (updateData.invoiceDate && updateData.dt) {
            const invoiceDate = new Date(updateData.invoiceDate);
            const dtDate = new Date(updateData.dt);
            if (!isNaN(invoiceDate.getTime()) && !isNaN(dtDate.getTime())) {
                if (invoiceDate > dtDate) {
                    throw new Error("Invoice date cannot be after delivery date");
                }
            }
        }
        if (updateData.manufacturingDate && updateData.expiryDate) {
            const mfgDate = new Date(updateData.manufacturingDate);
            const expDate = new Date(updateData.expiryDate);
            if (!isNaN(mfgDate.getTime()) && !isNaN(expDate.getTime())) {
                if (mfgDate >= expDate) {
                    throw new Error("Expiry date must be after manufacturing date");
                }
            }
        }
    }
    /**
     * Validate string fields with length constraints
     */
    static validateStringFields(updateData) {
        const stringFields = [
            { field: "receivedBy", value: updateData.receivedBy, maxLength: 255 },
            { field: "verifiedBy", value: updateData.verifiedBy, maxLength: 255 },
        ];
        stringFields.forEach(({ field, value, maxLength }) => {
            if (value !== undefined) {
                if (typeof value !== "string") {
                    throw new Error(`${field} must be a string`);
                }
                if (value.length > maxLength) {
                    throw new Error(`${field} cannot exceed ${maxLength} characters`);
                }
            }
        });
    }
    /**
     * Validate foreign key references
     */
    static validateForeignKeys(updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate supplier ID
            if (updateData.supplierId !== undefined) {
                if (!Number.isInteger(updateData.supplierId) ||
                    updateData.supplierId <= 0) {
                    throw new Error("Supplier ID must be a positive integer");
                }
                const supplier = yield prisma.supplier.findUnique({
                    where: { id: updateData.supplierId },
                });
                if (!supplier) {
                    throw new Error(`Supplier not found: ${updateData.supplierId}`);
                }
            }
            // Validate district ID
            if (updateData.districtId !== undefined) {
                if (!Number.isInteger(updateData.districtId) ||
                    updateData.districtId <= 0) {
                    throw new Error("District ID must be a positive integer");
                }
                const district = yield prisma.district.findUnique({
                    where: { id: updateData.districtId },
                });
                if (!district) {
                    throw new Error(`District not found: ${updateData.districtId}`);
                }
            }
        });
    }
    /**
     * Validate purchase items with special attention to quantities and pricing
     */
    static validatePurchaseItems(items, existingItems) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(items)) {
                throw new Error("Items must be an array");
            }
            // if (items.length === 0) {
            //   throw new Error("At least one item is required");
            // }
            if (items.length > 100) {
                throw new Error("Cannot process more than 100 items at once");
            }
            // Validate each item
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemPrefix = `Item ${i + 1}`;
                // Skip validation for items marked for deletion (except ID validation)
                if (item._delete) {
                    if (!item.id || !Number.isInteger(item.id) || item.id <= 0) {
                        throw new Error(`${itemPrefix}: Valid item ID is required for deletion`);
                    }
                    const existingItem = existingItems.find((ei) => ei.id === item.id);
                    if (!existingItem) {
                        throw new Error(`${itemPrefix}: Item to delete not found in current purchase`);
                    }
                    continue;
                }
                // Validate product ID
                yield this.validateItemProductId(item, itemPrefix);
                // Validate quantities (CRITICAL VALIDATION)
                this.validateItemQuantities(item, itemPrefix);
                // Validate pricing (CRITICAL VALIDATION)
                this.validateItemPricing(item, itemPrefix);
                // Validate status
                this.validateItemStatus(item, itemPrefix);
                // Validate update reason
                this.validateItemUpdateReason(item, itemPrefix);
                // Validate item ID for updates
                if (item.id !== undefined) {
                    if (!Number.isInteger(item.id) || item.id <= 0) {
                        throw new Error(`${itemPrefix}: Item ID must be a positive integer`);
                    }
                    const existingItem = existingItems.find((ei) => ei.id === item.id);
                    if (!existingItem) {
                        throw new Error(`${itemPrefix}: Item to update not found in current purchase`);
                    }
                }
            }
            // Check for duplicate product IDs in the request
            this.validateNoDuplicateProducts(items);
        });
    }
    /**
     * Validate item product ID
     */
    static validateItemProductId(item, itemPrefix) {
        return __awaiter(this, void 0, void 0, function* () {
            if (item.productId === undefined || item.productId === null) {
                throw new Error(`${itemPrefix}: Product ID is required`);
            }
            if (!Number.isInteger(item.productId) || item.productId <= 0) {
                throw new Error(`${itemPrefix}: Product ID must be a positive integer`);
            }
            // Check if product exists
            const product = yield prisma.product.findUnique({
                where: { id: item.productId },
            });
            if (!product) {
                throw new Error(`${itemPrefix}: Product not found: ${item.productId}`);
            }
        });
    }
    /**
     * Validate item quantities - CRITICAL VALIDATION
     */
    static validateItemQuantities(item, itemPrefix) {
        // Initial Quantity Validation
        if (item.initialQuantity === undefined || item.initialQuantity === null) {
            throw new Error(`${itemPrefix}: Initial quantity is required`);
        }
        if (!Number.isInteger(item.initialQuantity)) {
            throw new Error(`${itemPrefix}: Initial quantity must be an integer`);
        }
        if (item.initialQuantity < 0) {
            throw new Error(`${itemPrefix}: Initial quantity cannot be negative`);
        }
        if (item.initialQuantity === 0) {
            throw new Error(`${itemPrefix}: Initial quantity must be greater than zero`);
        }
        if (item.initialQuantity > 1000000) {
            throw new Error(`${itemPrefix}: Initial quantity cannot exceed 1,000,000`);
        }
        // Current Quantity Validation
        if (item.currentQuantity === undefined || item.currentQuantity === null) {
            throw new Error(`${itemPrefix}: Current quantity is required`);
        }
        if (!Number.isInteger(item.currentQuantity)) {
            throw new Error(`${itemPrefix}: Current quantity must be an integer`);
        }
        if (item.currentQuantity < 0) {
            throw new Error(`${itemPrefix}: Current quantity cannot be negative`);
        }
        if (item.currentQuantity > 1000000) {
            throw new Error(`${itemPrefix}: Current quantity cannot exceed 1,000,000`);
        }
        // Cross-validation: Current quantity should not exceed initial quantity
        if (item.currentQuantity > item.initialQuantity) {
            throw new Error(`${itemPrefix}: Current quantity (${item.currentQuantity}) cannot exceed initial quantity (${item.initialQuantity})`);
        }
    }
    /**
     * Validate item pricing - CRITICAL VALIDATION
     */
    static validateItemPricing(item, itemPrefix) {
        // Cost Price Validation
        if (item.costPrice === undefined || item.costPrice === null) {
            throw new Error(`${itemPrefix}: Cost price is required`);
        }
        if (typeof item.costPrice !== "number") {
            throw new Error(`${itemPrefix}: Cost price must be a number`);
        }
        if (isNaN(item.costPrice)) {
            throw new Error(`${itemPrefix}: Cost price must be a valid number`);
        }
        if (item.costPrice < 0) {
            throw new Error(`${itemPrefix}: Cost price cannot be negative`);
        }
        if (item.costPrice === 0) {
            throw new Error(`${itemPrefix}: Cost price must be greater than zero`);
        }
        if (item.costPrice > 999999.99) {
            throw new Error(`${itemPrefix}: Cost price cannot exceed 999,999.99`);
        }
        // Check decimal places (max 2)
        const costDecimalPlaces = (item.costPrice.toString().split(".")[1] || "")
            .length;
        if (costDecimalPlaces > 2) {
            throw new Error(`${itemPrefix}: Cost price can have maximum 2 decimal places`);
        }
        // Retail Price Validation
        if (item.retailPrice === undefined || item.retailPrice === null) {
            throw new Error(`${itemPrefix}: Retail price is required`);
        }
        if (typeof item.retailPrice !== "number") {
            throw new Error(`${itemPrefix}: Retail price must be a number`);
        }
        if (isNaN(item.retailPrice)) {
            throw new Error(`${itemPrefix}: Retail price must be a valid number`);
        }
        if (item.retailPrice < 0) {
            throw new Error(`${itemPrefix}: Retail price cannot be negative`);
        }
        if (item.retailPrice === 0) {
            throw new Error(`${itemPrefix}: Retail price must be greater than zero`);
        }
        if (item.retailPrice > 999999.99) {
            throw new Error(`${itemPrefix}: Retail price cannot exceed 999,999.99`);
        }
        // Check decimal places (max 2)
        const retailDecimalPlaces = (item.retailPrice.toString().split(".")[1] || "").length;
        if (retailDecimalPlaces > 2) {
            throw new Error(`${itemPrefix}: Retail price can have maximum 2 decimal places`);
        }
        // Cross-validation: Retail price should typically be higher than cost price
        if (item.retailPrice < item.costPrice) {
            throw new Error(`${itemPrefix}: Retail price (${item.retailPrice}) is lower than cost price (${item.costPrice}). Please verify pricing.`);
        }
    }
    /**
     * Validate item status
     */
    static validateItemStatus(item, itemPrefix) {
        if (item.status !== undefined) {
            const validStatuses = ["ACTIVE", "EXPIRED", "DAMAGED", "RETURNED"];
            if (!validStatuses.includes(item.status)) {
                throw new Error(`${itemPrefix}: Status must be one of: ${validStatuses.join(", ")}`);
            }
        }
    }
    /**
     * Validate item update reason
     */
    static validateItemUpdateReason(item, itemPrefix) {
        if (item.lastUpdateReason !== undefined) {
            if (typeof item.lastUpdateReason !== "string") {
                throw new Error(`${itemPrefix}: Update reason must be a string`);
            }
            if (item.lastUpdateReason.length > 500) {
                throw new Error(`${itemPrefix}: Update reason cannot exceed 500 characters`);
            }
        }
    }
    /**
     * Check for duplicate product IDs in the same request
     */
    static validateNoDuplicateProducts(items) {
        const productIds = items
            .filter((item) => !item._delete && item.productId)
            .map((item) => item.productId);
        const duplicates = productIds.filter((id, index) => productIds.indexOf(id) !== index);
        const uniqueDuplicates = [...new Set(duplicates)];
        if (uniqueDuplicates.length > 0) {
            throw new Error(`Duplicate product IDs found in request: ${uniqueDuplicates.join(", ")}`);
        }
    }
    /**
     * Validate business rules
     */
    static validateBusinessRules(updateData, existingPurchase) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check for duplicate batch number with different supplier
            if (updateData.batchNumber && updateData.supplierId) {
                const duplicateBatch = yield prisma.purchase.findFirst({
                    where: {
                        batchNumber: updateData.batchNumber,
                        supplierId: updateData.supplierId,
                        id: { not: existingPurchase.id },
                    },
                });
                if (duplicateBatch) {
                    throw new Error(`Batch number '${updateData.batchNumber}' already exists for this supplier`);
                }
            }
            // Prevent updating purchases that are in certain statuses
            if (existingPurchase.status === "RETURNED") {
                throw new Error("Cannot update a purchase that has been returned");
            }
            // Validate that expiry date is not in the past for active items
            if (updateData.status === "ACTIVE" && updateData.expiryDate) {
                const expiryDate = new Date(updateData.expiryDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (expiryDate < today) {
                    throw new Error("Cannot set an active purchase with expiry date in the past");
                }
            }
        });
    }
}
exports.PurchaseUpdateValidator = PurchaseUpdateValidator;
/**
 * Main validation function to be called from controller
 */
const validatePurchaseUpdateRequest = (purchaseId, updateData, userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield PurchaseUpdateValidator.validatePurchaseUpdate(purchaseId, updateData, userId);
});
exports.validatePurchaseUpdateRequest = validatePurchaseUpdateRequest;
