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
exports.checkAndUpdateExpiredBatches = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const checkAndUpdateExpiredBatches = () => __awaiter(void 0, void 0, void 0, function* () {
    const currentDate = new Date();
    try {
        // Find all active batches that have expired
        const expiredBatches = yield prisma.inventoryBatch.findMany({
            where: {
                status: "ACTIVE",
                expiryDate: {
                    lt: currentDate, // Less than current date = expired
                },
            },
            include: {
                items: {
                    where: {
                        status: "ACTIVE", // Only get active items
                    },
                },
            },
        });
        if (expiredBatches.length > 0) {
            // Update expired batches
            yield prisma.inventoryBatch.updateMany({
                where: {
                    status: "ACTIVE",
                    expiryDate: {
                        lt: currentDate,
                    },
                },
                data: {
                    status: "EXPIRED",
                    updatedAt: currentDate,
                },
            });
            // Update all inventory items in expired batches
            for (const batch of expiredBatches) {
                if (batch.items.length > 0) {
                    yield prisma.inventoryItem.updateMany({
                        where: {
                            batchId: batch.id,
                            status: "ACTIVE",
                        },
                        data: {
                            status: "EXPIRED",
                            updatedAt: currentDate,
                            lastUpdateReason: "Automatically expired due to batch expiry date",
                        },
                    });
                    // Optional: Create inventory movements for each expired item
                    for (const item of batch.items) {
                        yield prisma.inventoryMovement.create({
                            data: {
                                inventoryItemId: item.id,
                                movementType: "EXPIRED",
                                quantity: -item.currentQuantity, // Negative to indicate removal from active stock
                                reason: `Batch expired on ${batch.expiryDate.toISOString().split("T")[0]}`,
                                previousQuantity: item.currentQuantity,
                                newQuantity: 0, // Set to 0 as it's no longer usable
                                createdById: 1, // System user ID - you might want to make this configurable
                                referenceId: `EXPIRED_${batch.referenceNumber}`,
                            },
                        });
                    }
                }
            }
            console.log(`Updated ${expiredBatches.length} expired batches and their items`);
        }
    }
    catch (error) {
        console.error("Error updating expired batches:", error);
        // Don't throw error to prevent breaking the main function
    }
});
exports.checkAndUpdateExpiredBatches = checkAndUpdateExpiredBatches;
