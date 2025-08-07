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
exports.purchase_create = void 0;
const client_1 = require("@prisma/client");
const validateCreatePurchaseBatch_1 = require("@utils/Validators/validateCreatePurchaseBatch");
const generateRefNumber_1 = require("@utils/reference number/generateRefNumber");
const prisma = new client_1.PrismaClient();
const purchase_create = (data, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ─── RUNTIME VALIDATION CHECK ──────────────────────────────────────────
        // If anything is invalid, validateCreatePurchaseBatchesInput will throw.
        // Pass the prisma instance here
        yield (0, validateCreatePurchaseBatch_1.validateCreatePurchaseBatch)(data, prisma); // Make sure to await
        const batchKeys = new Set();
        for (const batch of data.batches) {
            const key = `${batch.supplierId}-${batch.batchNumber}`;
            if (batchKeys.has(key)) {
                throw new Error(`Duplicate batch found in request: Supplier ${batch.supplierId}, Batch ${batch.batchNumber}`);
            }
            batchKeys.add(key);
        }
        // ─── EXISTING UNIQUE‐BATCH CHECK ────────────────────────────────────────
        for (const batch of data.batches) {
            const exists = yield prisma.purchase.findFirst({
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
                const referenceNumber = yield (0, generateRefNumber_1.generateRefNumber)(prisma, 6, "PUR");
                // 1) Create Purchase
                const batch = yield tx.purchase.create({
                    data: {
                        referenceNumber: referenceNumber,
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
                // 2) Create Purchase Items for each item
                const items = yield Promise.all(batchData.items.map((itemData) => __awaiter(void 0, void 0, void 0, function* () {
                    const item = yield tx.purchaseItems.create({
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
                    // Create purchase edit log for new purchase item
                    yield tx.purchaseEdit.create({
                        data: {
                            editType: "PURCHASE",
                            referenceNumber: referenceNumber,
                            purchaseItemId: item.id,
                            action: "INSERT",
                            changedFields: {
                                genericName: { old: "none", new: item.product.generic.name },
                                brandName: { old: "none", new: item.product.brand.name },
                                initialQuantity: {
                                    old: "none",
                                    new: itemData.initialQuantity,
                                },
                                currentQuantity: {
                                    old: "none",
                                    new: itemData.initialQuantity,
                                },
                                costPrice: { old: "none", new: itemData.costPrice },
                                retailPrice: { old: "none", new: itemData.retailPrice },
                            },
                            reason: "New purchase item created",
                            editedById: userId,
                            batchNumber: batch.batchNumber,
                            genericName: item.product.generic.name,
                            brandName: item.product.brand.name,
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
        throw new Error(error);
    }
    finally {
        // It's generally better to manage prisma connection at a higher level
        // or use a single instance throughout the application,
        // but if you must disconnect here, ensure it's always called.
        yield prisma.$disconnect();
    }
});
exports.purchase_create = purchase_create;
