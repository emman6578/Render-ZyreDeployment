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
exports.inventory_create = void 0;
const client_1 = require("@prisma/client");
const validateCreateInventoryBatch_1 = require("@utils/Validators/validateCreateInventoryBatch");
const generateRefNumber_1 = require("@utils/reference number/generateRefNumber");
const prisma = new client_1.PrismaClient();
const inventory_create = (data, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ─── RUNTIME VALIDATION CHECK ──────────────────────────────────────────
        // If anything is invalid, validateCreateInventoryBatchesInput will throw.
        // Pass the prisma instance here
        yield (0, validateCreateInventoryBatch_1.validateCreateInventoryBatchesInput)(data, prisma); // Make sure to await
        // ─── EXISTING UNIQUE‐BATCH CHECK ────────────────────────────────────────
        for (const batch of data.batches) {
            const exists = yield prisma.inventoryBatch.findFirst({
                where: {
                    supplierId: batch.supplierId,
                    batchNumber: batch.batchNumber,
                },
            });
            if (exists) {
                throw new Error(`Batch with number ${batch.batchNumber} already exists for supplier ${batch.supplierId}.`);
            }
        }
        // ─── MAIN TRANSACTIONAL LOGIC ──────────────────────────────────────────
        const createdBatches = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const results = [];
            for (const batchData of data.batches) {
                // 1) Create InventoryBatch
                const batch = yield tx.inventoryBatch.create({
                    data: {
                        referenceNumber: yield (0, generateRefNumber_1.generateRefNumber)(prisma, 6, "INV"),
                        batchNumber: batchData.batchNumber,
                        supplierId: batchData.supplierId,
                        districtId: batchData.districtId,
                        dt: batchData.dt,
                        invoiceNumber: batchData.invoiceNumber,
                        invoiceDate: new Date(batchData.invoiceDate),
                        expiryDate: new Date(batchData.expiryDate),
                        manufacturingDate: batchData.manufacturingDate
                            ? new Date(batchData.manufacturingDate)
                            : undefined,
                        receivedBy: batchData.receivedBy,
                        verifiedBy: batchData.verifiedBy,
                        verificationDate: batchData.verificationDate
                            ? new Date(batchData.verificationDate)
                            : undefined,
                        createdById: userId,
                        status: "ACTIVE",
                    },
                    include: {
                        supplier: {
                            select: { id: true, name: true },
                        },
                        district: {
                            select: { id: true, name: true },
                        },
                    },
                });
                // 2) Create InventoryItem + InventoryMovement for each item
                const items = yield Promise.all(batchData.items.map((itemData) => __awaiter(void 0, void 0, void 0, function* () {
                    const item = yield tx.inventoryItem.create({
                        data: {
                            batchId: batch.id,
                            productId: itemData.productId,
                            initialQuantity: itemData.initialQuantity,
                            currentQuantity: itemData.initialQuantity,
                            costPrice: itemData.costPrice,
                            retailPrice: itemData.retailPrice,
                            createdById: userId,
                            status: "ACTIVE",
                        },
                        include: {
                            product: {
                                include: {
                                    generic: { select: { name: true } },
                                    brand: { select: { name: true } },
                                    company: { select: { name: true } },
                                },
                            },
                        },
                    });
                    yield tx.productTransaction.create({
                        data: {
                            referenceNumber: batch.referenceNumber,
                            productId: itemData.productId,
                            transactionType: "INVENTORY_ADDED",
                            userId: userId,
                            sourceModel: "InventoryItem",
                            sourceId: item.id, // The specific inventory item created
                            description: `Added to inventory - Batch: ${batch.batchNumber}, Product: ${item.product.generic.name} ${item.product.brand.name}`,
                            quantityIn: itemData.initialQuantity,
                            costPrice: itemData.costPrice,
                            retailPrice: itemData.retailPrice,
                        },
                    });
                    // create initial InventoryMovement
                    yield tx.inventoryMovement.create({
                        data: {
                            inventoryItemId: item.id,
                            movementType: "INBOUND",
                            quantity: itemData.initialQuantity,
                            referenceId: batch.referenceNumber,
                            reason: `Initial stock from batch ${batch.batchNumber}`,
                            previousQuantity: 0,
                            newQuantity: itemData.initialQuantity,
                            createdById: userId,
                        },
                    });
                    return {
                        id: item.id,
                        productId: item.productId,
                        initialQuantity: item.initialQuantity,
                        currentQuantity: item.currentQuantity,
                        costPrice: parseFloat(item.costPrice.toString()),
                        retailPrice: parseFloat(item.retailPrice.toString()),
                        status: item.status,
                        product: {
                            id: item.product.id,
                            generic: { name: item.product.generic.name },
                            brand: { name: item.product.brand.name },
                            company: { name: item.product.company.name },
                        },
                    };
                })));
                // 3) Compute totals
                const totalCostValue = items.reduce((sum, i) => sum + i.costPrice * i.initialQuantity, 0);
                const totalRetailValue = items.reduce((sum, i) => sum + i.retailPrice * i.initialQuantity, 0);
                results.push({
                    id: batch.id,
                    batchNumber: batch.batchNumber,
                    invoiceDate: batch.invoiceDate,
                    expiryDate: batch.expiryDate,
                    manufacturingDate: (_a = batch.manufacturingDate) !== null && _a !== void 0 ? _a : undefined,
                    status: batch.status,
                    supplier: batch.supplier,
                    district: batch.district,
                    items,
                    itemsCount: items.length,
                    totalCostValue: Math.round(totalCostValue * 100) / 100,
                    totalRetailValue: Math.round(totalRetailValue * 100) / 100,
                });
            }
            return results;
        }));
        return createdBatches;
    }
    catch (error) {
        throw new Error("Error creating inventory batches:" + error);
        // Do not disconnect prisma here if the error is from the validator,
        // as it might be needed again if the calling function handles the error and retries.
        // Disconnection is best handled at the end of the main function's lifecycle.
        throw error;
    }
    finally {
        // It's generally better to manage prisma connection at a higher level
        // or use a single instance throughout the application,
        // but if you must disconnect here, ensure it's always called.
        yield prisma.$disconnect();
    }
});
exports.inventory_create = inventory_create;
