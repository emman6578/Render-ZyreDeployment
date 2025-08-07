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
exports.updateSalesReturnStatusService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const updateSalesReturnStatusService = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { salesReturnId, newStatus, notes, userId, ipAddress, userAgent } = params;
    // Validation
    if (!userId) {
        throw new Error("User authentication required");
    }
    if (!salesReturnId || !newStatus) {
        throw new Error("Sales return ID and new status are required");
    }
    // Use Prisma transaction for data consistency
    return yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Get sales return with all necessary details
        const salesReturn = yield tx.salesReturn.findUnique({
            where: { id: salesReturnId },
            include: {
                originalSale: {
                    include: {
                        inventoryItem: {
                            include: {
                                product: true,
                                batch: true,
                            },
                        },
                    },
                },
                processedBy: true,
                approvedBy: true,
            },
        });
        if (!salesReturn) {
            throw new Error("Sales return not found");
        }
        // Check if status can be updated
        if (salesReturn.status === "PROCESSED" ||
            salesReturn.status === "CANCELLED") {
            throw new Error(`Cannot update status from ${salesReturn.status}`);
        }
        // Update sales return status
        const updatedSalesReturn = yield tx.salesReturn.update({
            where: { id: salesReturnId },
            data: {
                status: newStatus,
                approvedById: newStatus === "APPROVED" || newStatus === "PROCESSED" ? userId : null,
                updatedAt: new Date(),
            },
            include: {
                originalSale: {
                    include: {
                        inventoryItem: {
                            include: {
                                product: true,
                                batch: true,
                            },
                        },
                    },
                },
                processedBy: true,
                approvedBy: true,
            },
        });
        const updatedModels = {};
        // Only process related models when status is PROCESSED
        if (newStatus === "PROCESSED") {
            const { originalSale } = updatedSalesReturn;
            const { inventoryItem } = originalSale;
            // Get all returns for this sale to calculate total returned quantity
            const allReturnsForSale = yield tx.salesReturn.findMany({
                where: {
                    originalSaleId: originalSale.id,
                    status: {
                        in: ["PENDING", "APPROVED", "PROCESSED"],
                    },
                },
            });
            // Calculate total quantity already returned
            const totalReturnedQuantity = allReturnsForSale.reduce((sum, returnItem) => sum + returnItem.returnQuantity, 0);
            // 1. Create Product Transaction
            if (updatedSalesReturn.restockable) {
                const productTransaction = yield tx.productTransaction.create({
                    data: {
                        referenceNumber: updatedSalesReturn.transactionID,
                        productId: inventoryItem.productId,
                        transactionType: "SALES_RETURN",
                        quantityIn: updatedSalesReturn.returnQuantity,
                        costPrice: inventoryItem.costPrice,
                        retailPrice: inventoryItem.retailPrice,
                        userId,
                        sourceModel: "SalesReturn",
                        sourceId: updatedSalesReturn.id,
                        description: `Sales return ${updatedSalesReturn.transactionID} - ${updatedSalesReturn.returnReason}`,
                    },
                });
                updatedModels.productTransaction = true;
            }
            else {
                // If not restockable, record as quantityOut since items are being removed from available inventory
                const productTransaction = yield tx.productTransaction.create({
                    data: {
                        referenceNumber: updatedSalesReturn.transactionID,
                        productId: inventoryItem.productId,
                        transactionType: "SALES_RETURN",
                        quantityOut: updatedSalesReturn.returnQuantity,
                        costPrice: inventoryItem.costPrice,
                        retailPrice: inventoryItem.retailPrice,
                        userId,
                        sourceModel: "SalesReturn",
                        sourceId: updatedSalesReturn.id,
                        description: `Sales return (non-restockable) ${updatedSalesReturn.transactionID} - ${updatedSalesReturn.returnReason}`,
                    },
                });
                updatedModels.productTransaction = true;
            }
            // 2. Create Inventory Movement
            if (updatedSalesReturn.restockable) {
                // If restockable, positive quantity (items coming back to inventory)
                const inventoryMovement = yield tx.inventoryMovement.create({
                    data: {
                        inventoryItemId: inventoryItem.id,
                        movementType: "RETURN",
                        quantity: updatedSalesReturn.returnQuantity, // Positive for return
                        reason: `Sales return: ${updatedSalesReturn.returnReason}`,
                        referenceId: updatedSalesReturn.transactionID,
                        createdById: userId,
                        previousQuantity: inventoryItem.currentQuantity,
                        newQuantity: inventoryItem.currentQuantity + updatedSalesReturn.returnQuantity,
                        ipAddress,
                        userAgent,
                    },
                });
                updatedModels.inventoryMovement = true;
            }
            else {
                // If not restockable, negative quantity (items being removed from available inventory)
                const inventoryMovement = yield tx.inventoryMovement.create({
                    data: {
                        inventoryItemId: inventoryItem.id,
                        movementType: "RETURN",
                        quantity: -updatedSalesReturn.returnQuantity, // Negative for non-restockable
                        reason: `Sales return (non-restockable): ${updatedSalesReturn.returnReason}`,
                        referenceId: updatedSalesReturn.transactionID,
                        createdById: userId,
                        previousQuantity: inventoryItem.currentQuantity,
                        newQuantity: inventoryItem.currentQuantity, // No change to inventory quantity
                        ipAddress,
                        userAgent,
                    },
                });
                updatedModels.inventoryMovement = true;
            }
            // 3. Update Inventory Item (only if restockable is true)
            if (updatedSalesReturn.restockable) {
                yield tx.inventoryItem.update({
                    where: { id: inventoryItem.id },
                    data: {
                        currentQuantity: {
                            increment: updatedSalesReturn.returnQuantity,
                        },
                        updatedBy: { connect: { id: userId } },
                        updatedAt: new Date(),
                    },
                });
                updatedModels.inventoryItem = true;
            }
            // Update the original sale status based on total returned quantity
            if (totalReturnedQuantity < originalSale.quantity) {
                yield tx.sales.update({
                    where: { id: originalSale.id },
                    data: {
                        status: "PARTIALLY_RETURNED",
                        updatedBy: { connect: { id: userId } },
                    },
                });
            }
            else if (totalReturnedQuantity === originalSale.quantity) {
                yield tx.sales.update({
                    where: { id: originalSale.id },
                    data: {
                        status: "RETURNED",
                        updatedBy: { connect: { id: userId } },
                    },
                });
            }
        }
        // Log the activity
        yield tx.activityLog.create({
            data: {
                userId,
                model: "SalesReturn",
                recordId: updatedSalesReturn.id,
                action: "UPDATE",
                description: `Updated sales return ${updatedSalesReturn.transactionID} status to ${newStatus}`,
                ipAddress,
                userAgent,
            },
        });
        // Return the formatted result
        return {
            salesReturn: {
                id: updatedSalesReturn.id,
                transactionID: updatedSalesReturn.transactionID,
                status: updatedSalesReturn.status,
                returnQuantity: updatedSalesReturn.returnQuantity,
                returnPrice: updatedSalesReturn.returnPrice.toNumber(),
                returnReason: updatedSalesReturn.returnReason,
                restockable: updatedSalesReturn.restockable,
                refundAmount: ((_a = updatedSalesReturn.refundAmount) === null || _a === void 0 ? void 0 : _a.toNumber()) || 0,
                updatedAt: updatedSalesReturn.updatedAt,
            },
            updatedModels,
        };
    }));
});
exports.updateSalesReturnStatusService = updateSalesReturnStatusService;
