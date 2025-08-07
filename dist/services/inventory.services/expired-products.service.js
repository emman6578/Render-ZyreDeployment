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
exports.expired_products_list = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    omit: {
        inventoryBatch: {
            createdById: true,
            updatedById: true,
            supplierId: true,
            districtId: true,
            createdAt: true,
            updatedAt: true,
            verificationDate: true,
        },
    },
});
const expired_products_list = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, itemsPerPage, search, dateFrom, dateTo } = params;
    const today = new Date();
    // Build date filter conditions
    const dateFilter = {};
    if (dateFrom) {
        dateFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
        dateFilter.lte = new Date(dateTo);
    }
    // Build dynamic `where` filter
    const where = Object.assign({ expiryDate: Object.assign({ lt: today, not: undefined }, (Object.keys(dateFilter).length > 0 && dateFilter)) }, (search && {
        OR: [{ batchNumber: { contains: search } }],
    }));
    // Run both count and paginated query in a transaction
    const [totalItems, expired] = yield prisma.$transaction([
        prisma.inventoryBatch.count({ where }),
        prisma.inventoryBatch.findMany({
            where,
            skip: (page - 1) * itemsPerPage,
            take: itemsPerPage,
            include: {
                supplier: { select: { name: true } },
                district: { select: { name: true } },
                items: {
                    select: {
                        id: true,
                        product: {
                            select: {
                                id: true,
                                generic: { select: { name: true } },
                                brand: { select: { name: true } },
                                company: { select: { name: true } },
                                categories: { select: { name: true } },
                            },
                        },
                        lastUpdateReason: true,
                        costPrice: true,
                        retailPrice: true,
                        currentQuantity: true,
                        status: true,
                    },
                },
            },
        }),
    ]);
    // Check for existing transactions to avoid duplicates
    const existingTransactions = yield prisma.productTransaction.findMany({
        where: {
            transactionType: "EXPIRED",
            sourceModel: "InventoryItem",
            sourceId: {
                in: expired.flatMap((batch) => batch.items.map((item) => item.id)),
            },
        },
        select: {
            sourceId: true,
        },
    });
    const existingTransactionSourceIds = new Set(existingTransactions.map((t) => t.sourceId));
    // Create transaction records only for items that don't already have expired transactions
    const transactionPromises = expired.flatMap((batch) => batch.items
        .map((item) => {
        // Only create transaction if:
        // 1. Item has quantity > 0
        // 2. No existing expired transaction for this inventory item
        if (item.currentQuantity > 0 &&
            !existingTransactionSourceIds.has(item.id)) {
            return prisma.productTransaction.create({
                data: {
                    referenceNumber: batch.referenceNumber,
                    productId: item.product.id,
                    transactionType: "EXPIRED",
                    quantityOut: item.currentQuantity,
                    costPrice: item.costPrice,
                    retailPrice: item.retailPrice,
                    userId: params.userId,
                    sourceModel: "InventoryItem",
                    sourceId: item.id,
                    description: `Product expired from batch ${batch.batchNumber} - ${item.product.generic.name} (${item.product.brand.name})`,
                },
            });
        }
        return null;
    })
        .filter(Boolean));
    // Execute all transaction creations
    yield Promise.all(transactionPromises);
    // Filter out batches that are already expired to avoid unnecessary updates
    const batchesToUpdate = expired.filter((batch) => batch.status !== "EXPIRED");
    const inventoryItemsToUpdate = expired.flatMap((batch) => batch.items
        .filter((item) => item.status !== "EXPIRED")
        .map((item) => item.id));
    // // Update inventory batch status to EXPIRED only for batches that aren't already expired
    // if (batchesToUpdate.length > 0) {
    //   await prisma.inventoryBatch.updateMany({
    //     where: {
    //       id: { in: batchesToUpdate.map((batch) => batch.id) },
    //     },
    //     data: {
    //       status: "EXPIRED",
    //     },
    //   });
    // }
    yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // Update inventory batch status to EXPIRED only for batches that aren't already expired
        if (batchesToUpdate.length > 0) {
            yield tx.inventoryBatch.updateMany({
                where: {
                    id: { in: batchesToUpdate.map((batch) => batch.id) },
                },
                data: {
                    status: "EXPIRED",
                    updatedById: params.userId, // Track who updated the batch
                },
            });
        }
        // NEW: Update inventory items status to EXPIRED
        if (inventoryItemsToUpdate.length > 0) {
            yield tx.inventoryItem.updateMany({
                where: {
                    id: { in: inventoryItemsToUpdate },
                },
                data: {
                    status: "EXPIRED",
                    updatedById: params.userId, // Track who updated the items
                    lastUpdateReason: "Automatically expired due to batch expiry date", // Add reason for update
                },
            });
        }
    }));
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
    // Calculate financial loss analysis for ALL expired products (not just paginated)
    const allExpiredProducts = yield prisma.inventoryBatch.findMany({
        where,
        include: {
            items: {
                select: {
                    costPrice: true,
                    retailPrice: true,
                    currentQuantity: true,
                },
            },
        },
    });
    const analysis = allExpiredProducts.reduce((acc, batch) => {
        batch.items.forEach((item) => {
            const quantity = item.currentQuantity || 0;
            const costPrice = item.costPrice || 0;
            const retailPrice = item.retailPrice || 0;
            // Calculate losses
            const costLoss = Number(quantity) * Number(costPrice);
            const potentialRevenueLoss = Number(quantity) * Number(retailPrice);
            acc.totalCostLoss += costLoss;
            acc.totalPotentialRevenueLoss += potentialRevenueLoss;
            acc.totalExpiredQuantity += quantity;
            acc.totalExpiredBatches += 1;
        });
        return acc;
    }, {
        totalCostLoss: 0,
        totalPotentialRevenueLoss: 0,
        totalExpiredQuantity: 0,
        totalExpiredBatches: 0,
    });
    // Add additional calculated metrics
    const finalAnalysis = Object.assign(Object.assign({}, analysis), { averageCostLossPerBatch: analysis.totalExpiredBatches > 0
            ? analysis.totalCostLoss / analysis.totalExpiredBatches
            : 0, averagePotentialRevenueLossPerBatch: analysis.totalExpiredBatches > 0
            ? analysis.totalPotentialRevenueLoss / analysis.totalExpiredBatches
            : 0, profitLoss: analysis.totalPotentialRevenueLoss - analysis.totalCostLoss });
    return {
        expired,
        pagination,
        analysis: finalAnalysis,
    };
});
exports.expired_products_list = expired_products_list;
