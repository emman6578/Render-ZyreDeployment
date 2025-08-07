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
exports.createSalesReturnService = void 0;
const client_1 = require("@prisma/client");
const generateRefNumber_1 = require("@utils/reference number/generateRefNumber");
const prisma = new client_1.PrismaClient();
const createSalesReturnService = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { originalSaleId, returnQuantity, returnReason, notes, restockable = true, userId, ipAddress, userAgent, } = params;
    // Validation (unchanged)
    if (!userId) {
        throw new Error("User authentication required");
    }
    if (!originalSaleId || !returnQuantity || !returnReason) {
        throw new Error("Original sale ID, return quantity, and return reason are required");
    }
    if (returnQuantity <= 0) {
        throw new Error("Return quantity must be greater than 0");
    }
    // Generate unique reference number outside transaction
    const referenceNumber = yield (0, generateRefNumber_1.generateRefNumber)(prisma, 6, "SR");
    // Use Prisma transaction for data consistency
    return yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // Get original sale with all necessary details
        const originalSale = yield tx.sales.findUnique({
            where: { id: originalSaleId },
            include: {
                returns: {
                    where: {
                        status: {
                            in: ["PENDING", "APPROVED", "PROCESSED"],
                        },
                    },
                },
                inventoryItem: true,
            },
        });
        if (!originalSale) {
            throw new Error("Original sale not found");
        }
        if (originalSale.status !== "ACTIVE" &&
            originalSale.status !== "PARTIALLY_RETURNED") {
            throw new Error("Cannot create return for sale unless status is ACTIVE or PARTIALLY_RETURNED");
        }
        // Calculate total quantity already returned
        const totalReturnedQuantity = originalSale.returns.reduce((sum, returnItem) => sum + returnItem.returnQuantity, 0);
        // Check if return quantity exceeds available quantity
        const availableQuantity = originalSale.quantity - totalReturnedQuantity;
        if (returnQuantity > availableQuantity) {
            throw new Error(`Return quantity (${returnQuantity}) exceeds available quantity (${availableQuantity})`);
        }
        // Calculate return price and refund amount
        const returnPrice = originalSale.unitRetailPrice; // Use the final price from the sale
        const refundAmount = returnQuantity *
            (typeof returnPrice === "number" ? returnPrice : returnPrice.toNumber()); // Calculate refund automatically
        // Create the sales return (updated with automatic price/refund)
        const salesReturn = yield tx.salesReturn.create({
            data: {
                transactionID: referenceNumber,
                originalSaleId,
                returnQuantity,
                returnPrice, // Now using the sale's unitFinalPrice
                returnReason,
                notes,
                refundAmount, // Now automatically calculated
                restockable,
                processedById: userId,
                status: "PENDING",
            },
            include: {
                originalSale: {
                    include: {
                        inventoryItem: {
                            include: {
                                product: {
                                    include: {
                                        generic: true,
                                        brand: true,
                                        company: true,
                                    },
                                },
                                batch: {
                                    include: {
                                        supplier: true,
                                    },
                                },
                            },
                        },
                        customer: true,
                        psr: true,
                    },
                },
                processedBy: {
                    select: {
                        id: true,
                        fullname: true,
                        email: true,
                    },
                },
            },
        });
        // Note: Sales status will be updated in update_sales_return_status.service.ts when processed
        // Log the activity
        yield tx.activityLog.create({
            data: {
                userId,
                model: "SalesReturn",
                recordId: salesReturn.id,
                action: "CREATE",
                description: `Created sales return ${referenceNumber} for sale ${originalSale.transactionID}`,
                ipAddress,
                userAgent,
            },
        });
        // Return the formatted result
        return {
            salesReturn: {
                id: salesReturn.id,
                referenceNumber: salesReturn.transactionID,
                originalSale: {
                    referenceNumber: salesReturn.originalSale.transactionID,
                    productName: `${salesReturn.originalSale.genericName} ${salesReturn.originalSale.brandName}`,
                    batchNumber: salesReturn.originalSale.batchNumber,
                },
                returnQuantity: salesReturn.returnQuantity,
                returnPrice: salesReturn.returnPrice.toNumber(),
                returnReason: salesReturn.returnReason,
                status: salesReturn.status,
                restockable: salesReturn.restockable,
                processedBy: salesReturn.processedBy.fullname,
                createdAt: salesReturn.createdAt,
            },
        };
    }));
});
exports.createSalesReturnService = createSalesReturnService;
