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
exports.updatePurchase = void 0;
// purchase.service.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const updatePurchase = (purchaseId, updateData, userId, ipAddress, userAgent) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Fetch current purchase
        const currentPurchase = yield prisma.purchase.findUnique({
            where: { id: purchaseId },
            include: {
                items: true,
                supplier: true,
                district: true,
            },
        });
        if (!currentPurchase) {
            throw new Error("Purchase not found");
        }
        //CHECK: Prevent deletion if only one item exists
        if (updateData.items && updateData.items.length) {
            const itemsToDelete = updateData.items.filter((item) => item._delete && item.id);
            if (itemsToDelete.length > 0) {
                const currentItemCount = currentPurchase.items.length;
                const remainingItemsAfterDeletion = currentItemCount - itemsToDelete.length;
                if (remainingItemsAfterDeletion < 1) {
                    throw new Error("Cannot delete all items. Purchase must have at least one item.");
                }
            }
        }
        // 2. Run all updates in a transaction
        const updated = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // --- Prepare and apply purchase-level changes ---
            const purchaseUpdateFields = {};
            const purchaseChanges = {};
            let hadAnyItemChanges = false;
            // batchNumber, supplierId, districtId, dt, invoiceNumber...
            if (updateData.batchNumber !== undefined &&
                updateData.batchNumber !== currentPurchase.batchNumber) {
                purchaseUpdateFields.batchNumber = updateData.batchNumber;
                purchaseChanges.batchNumber = {
                    old: currentPurchase.batchNumber,
                    new: updateData.batchNumber,
                };
            }
            if (updateData.supplierId !== undefined &&
                updateData.supplierId !== currentPurchase.supplierId) {
                purchaseUpdateFields.supplier = {
                    connect: { id: updateData.supplierId },
                };
                purchaseChanges.supplierId = {
                    old: currentPurchase.supplierId,
                    new: updateData.supplierId,
                };
            }
            if (updateData.districtId !== undefined &&
                updateData.districtId !== currentPurchase.districtId) {
                purchaseUpdateFields.district = {
                    connect: { id: updateData.districtId },
                };
                purchaseChanges.districtId = {
                    old: currentPurchase.districtId,
                    new: updateData.districtId,
                };
            }
            if (updateData.dt !== undefined && updateData.dt !== currentPurchase.dt) {
                purchaseUpdateFields.dt = updateData.dt;
                purchaseChanges.dt = { old: currentPurchase.dt, new: updateData.dt };
            }
            if (updateData.invoiceNumber !== undefined &&
                updateData.invoiceNumber !== currentPurchase.invoiceNumber) {
                purchaseUpdateFields.invoiceNumber = updateData.invoiceNumber;
                purchaseChanges.invoiceNumber = {
                    old: currentPurchase.invoiceNumber,
                    new: updateData.invoiceNumber,
                };
            }
            if (updateData.invoiceDate !== undefined) {
                const newInvoiceDate = new Date(updateData.invoiceDate);
                if (newInvoiceDate.getTime() !== currentPurchase.invoiceDate.getTime()) {
                    purchaseUpdateFields.invoiceDate = newInvoiceDate;
                    purchaseChanges.invoiceDate = {
                        old: currentPurchase.invoiceDate,
                        new: newInvoiceDate,
                    };
                }
            }
            if (updateData.expiryDate !== undefined) {
                const newExpiryDate = new Date(updateData.expiryDate);
                if (newExpiryDate.getTime() !== currentPurchase.expiryDate.getTime()) {
                    purchaseUpdateFields.expiryDate = newExpiryDate;
                    purchaseChanges.expiryDate = {
                        old: currentPurchase.expiryDate,
                        new: newExpiryDate,
                    };
                }
            }
            if (updateData.manufacturingDate !== undefined) {
                const newManDate = updateData.manufacturingDate
                    ? new Date(updateData.manufacturingDate)
                    : null;
                const oldManDate = currentPurchase.manufacturingDate;
                if (((newManDate === null || newManDate === void 0 ? void 0 : newManDate.getTime()) || null) !== ((oldManDate === null || oldManDate === void 0 ? void 0 : oldManDate.getTime()) || null)) {
                    purchaseUpdateFields.manufacturingDate = newManDate;
                    purchaseChanges.manufacturingDate = {
                        old: oldManDate,
                        new: newManDate,
                    };
                }
            }
            if (updateData.status !== undefined &&
                updateData.status !== currentPurchase.status) {
                purchaseUpdateFields.status = updateData.status;
                purchaseChanges.status = {
                    old: currentPurchase.status,
                    new: updateData.status,
                };
            }
            if (updateData.receivedBy !== undefined &&
                updateData.receivedBy !== currentPurchase.receivedBy) {
                purchaseUpdateFields.receivedBy = updateData.receivedBy;
                purchaseChanges.receivedBy = {
                    old: currentPurchase.receivedBy,
                    new: updateData.receivedBy,
                };
            }
            if (updateData.verifiedBy !== undefined &&
                updateData.verifiedBy !== currentPurchase.verifiedBy) {
                purchaseUpdateFields.verifiedBy = updateData.verifiedBy;
                purchaseChanges.verifiedBy = {
                    old: currentPurchase.verifiedBy,
                    new: updateData.verifiedBy,
                };
            }
            if (updateData.verificationDate !== undefined) {
                const newVerDate = updateData.verificationDate
                    ? new Date(updateData.verificationDate)
                    : null;
                const oldVerDate = currentPurchase.verificationDate;
                if (((newVerDate === null || newVerDate === void 0 ? void 0 : newVerDate.getTime()) || null) !== ((oldVerDate === null || oldVerDate === void 0 ? void 0 : oldVerDate.getTime()) || null)) {
                    purchaseUpdateFields.verificationDate = newVerDate;
                    purchaseChanges.verificationDate = {
                        old: oldVerDate,
                        new: newVerDate,
                    };
                }
            }
            let updatedPurchase = currentPurchase;
            const getProductNames = (productId) => __awaiter(void 0, void 0, void 0, function* () {
                const product = yield tx.product.findUnique({
                    where: { id: productId },
                    include: {
                        generic: true,
                        brand: true,
                    },
                });
                return {
                    genericName: (product === null || product === void 0 ? void 0 : product.generic.name) || "",
                    brandName: (product === null || product === void 0 ? void 0 : product.brand.name) || "",
                };
            });
            // ✅ FIXED: Only create purchase edit log if there are actual purchase-level changes
            if (Object.keys(purchaseUpdateFields).length) {
                purchaseUpdateFields.updatedBy = { connect: { id: userId } };
                updatedPurchase = yield tx.purchase.update({
                    where: { id: purchaseId },
                    data: purchaseUpdateFields,
                    include: {
                        items: true,
                        supplier: true,
                        district: true,
                    },
                });
                const productsInPurchase = yield tx.product.findMany({
                    where: {
                        id: {
                            in: updatedPurchase.items.map((item) => item.productId),
                        },
                    },
                    include: {
                        generic: true,
                        brand: true,
                    },
                });
                const productNames = productsInPurchase
                    .map((p) => `${p.generic.name} (${p.brand.name})`)
                    .join(", ");
                // ✅ FIXED: Only log purchase edit when purchase fields actually changed
                yield tx.purchaseEdit.create({
                    data: {
                        editType: "PURCHASE",
                        referenceNumber: updatedPurchase.referenceNumber,
                        purchaseId,
                        action: "UPDATE",
                        changedFields: purchaseChanges,
                        reason: "Purchase record updated",
                        editedById: userId,
                        batchNumber: updatedPurchase.batchNumber,
                    },
                });
                yield tx.activityLog.create({
                    data: {
                        userId,
                        model: "Purchase",
                        recordId: purchaseId,
                        action: "UPDATE",
                        description: `Updated purchase batch: ${updatedPurchase.batchNumber}`,
                        ipAddress,
                        userAgent,
                    },
                });
            }
            // --- Handle each item in updateData.items ---
            if (updateData.items && updateData.items.length) {
                const currentItems = currentPurchase.items;
                for (const item of updateData.items) {
                    // DELETE
                    if (item._delete && item.id) {
                        const toDel = currentItems.find((ci) => ci.id === item.id);
                        const refNum = currentPurchase.referenceNumber;
                        if (toDel) {
                            hadAnyItemChanges = true;
                            // Before deleting, check for returns
                            const hasReturns = yield tx.purchaseReturn.count({
                                where: { originalPurchaseItemId: item.id },
                            });
                            if (hasReturns > 0) {
                                throw new Error("This item already has return record cannot be deleted");
                            }
                            yield tx.purchaseItems.delete({ where: { id: item.id } });
                            yield tx.productTransaction.create({
                                data: {
                                    productId: toDel.productId,
                                    transactionType: "PURCHASE_EDIT",
                                    quantityOut: toDel.currentQuantity,
                                    costPrice: toDel.costPrice,
                                    retailPrice: toDel.retailPrice,
                                    userId: userId,
                                    sourceModel: "PurchaseItems",
                                    sourceId: toDel.id,
                                    description: `Item removed from purchase batch ${updatedPurchase.batchNumber}`,
                                    referenceNumber: refNum,
                                },
                            });
                            const { genericName, brandName } = yield getProductNames(toDel.productId);
                            yield tx.purchaseEdit.create({
                                data: {
                                    editType: "PURCHASE_ITEM",
                                    referenceNumber: updatedPurchase.referenceNumber,
                                    purchaseItemId: item.id,
                                    action: "DELETE",
                                    changedFields: { deleted: { old: false, new: true } },
                                    reason: `Purchase item deleted`,
                                    editedById: userId,
                                    batchNumber: updatedPurchase.batchNumber,
                                    genericName,
                                    brandName,
                                },
                            });
                            yield tx.activityLog.create({
                                data: {
                                    userId,
                                    model: "PurchaseItems",
                                    recordId: item.id,
                                    action: "DELETE",
                                    description: `Deleted purchase item for product ID: ${toDel.productId}`,
                                    ipAddress,
                                    userAgent,
                                },
                            });
                        }
                        continue;
                    }
                    // UPDATE EXISTING
                    if (item.id) {
                        const curr = currentItems.find((ci) => ci.id === item.id);
                        if (!curr) {
                            console.log(`Item with ID ${item.id} not found in current items`);
                            continue;
                        }
                        const fields = {};
                        const changes = {};
                        if (item.productId !== curr.productId) {
                            fields.product = { connect: { id: item.productId } }; // ✅ Use relation syntax
                            changes.productId = { old: curr.productId, new: item.productId };
                        }
                        if (item.initialQuantity !== curr.initialQuantity) {
                            fields.initialQuantity = item.initialQuantity;
                            changes.initialQuantity = {
                                old: curr.initialQuantity,
                                new: item.initialQuantity,
                            };
                        }
                        if (item.currentQuantity !== curr.currentQuantity) {
                            fields.currentQuantity = item.currentQuantity;
                            changes.currentQuantity = {
                                old: curr.currentQuantity,
                                new: item.currentQuantity,
                            };
                        }
                        const currCost = parseFloat(curr.costPrice.toString());
                        if (item.costPrice !== currCost) {
                            fields.costPrice = item.costPrice;
                            changes.costPrice = { old: currCost, new: item.costPrice };
                        }
                        const currRetail = parseFloat(curr.retailPrice.toString());
                        if (item.retailPrice !== currRetail) {
                            fields.retailPrice = item.retailPrice;
                            changes.retailPrice = { old: currRetail, new: item.retailPrice };
                        }
                        if (item.status && item.status !== curr.status) {
                            fields.status = item.status;
                            changes.status = { old: curr.status, new: item.status };
                        }
                        if (item.lastUpdateReason) {
                            fields.lastUpdateReason = item.lastUpdateReason;
                            changes.lastUpdateReason = {
                                old: curr.lastUpdateReason,
                                new: item.lastUpdateReason,
                            };
                        }
                        // ✅ FIXED: Only create item edit log if there are actual item changes
                        if (Object.keys(fields).length) {
                            hadAnyItemChanges = true;
                            fields.updatedBy = { connect: { id: userId } };
                            yield tx.purchaseItems.update({
                                where: { id: item.id },
                                data: fields,
                            });
                            // ✅ FIXED: Only log item edit when item fields actually changed
                            const { genericName, brandName } = yield getProductNames(item.productId);
                            yield tx.purchaseEdit.create({
                                data: {
                                    editType: "PURCHASE_ITEM",
                                    referenceNumber: updatedPurchase.referenceNumber,
                                    purchaseItemId: item.id,
                                    action: "UPDATE",
                                    changedFields: changes,
                                    reason: item.lastUpdateReason || "Purchase item updated",
                                    editedById: userId,
                                    batchNumber: updatedPurchase.batchNumber,
                                    genericName,
                                    brandName,
                                },
                            });
                            yield tx.activityLog.create({
                                data: {
                                    userId,
                                    model: "PurchaseItems",
                                    recordId: item.id,
                                    action: "UPDATE",
                                    description: `Updated purchase item for product ID: ${item.productId}`,
                                    ipAddress,
                                    userAgent,
                                },
                            });
                        }
                        continue;
                    }
                    // CREATE NEW
                    hadAnyItemChanges = true;
                    const newItem = yield tx.purchaseItems.create({
                        data: {
                            batchId: purchaseId,
                            productId: item.productId,
                            initialQuantity: item.initialQuantity,
                            currentQuantity: item.currentQuantity,
                            costPrice: item.costPrice,
                            retailPrice: item.retailPrice,
                            status: (_a = item.status) !== null && _a !== void 0 ? _a : "ACTIVE",
                            lastUpdateReason: item.lastUpdateReason,
                            createdById: userId,
                            updatedById: userId,
                        },
                        include: {
                            batch: {
                                select: { referenceNumber: true },
                            },
                        },
                    });
                    // ✅ FIXED: This is correct - log new item creation
                    const { genericName, brandName } = yield getProductNames(item.productId);
                    yield tx.purchaseEdit.create({
                        data: {
                            editType: "PURCHASE_ITEM",
                            referenceNumber: updatedPurchase.referenceNumber,
                            purchaseItemId: newItem.id,
                            action: "INSERT",
                            changedFields: {
                                created: { old: null, new: true },
                                productId: { old: null, new: item.productId },
                                initialQuantity: { old: null, new: item.initialQuantity },
                                currentQuantity: { old: null, new: item.currentQuantity },
                                costPrice: { old: null, new: item.costPrice },
                                retailPrice: { old: null, new: item.retailPrice },
                            },
                            reason: item.lastUpdateReason || "New purchase item added",
                            editedById: userId,
                            batchNumber: updatedPurchase.batchNumber,
                            genericName,
                            brandName,
                        },
                    });
                    yield tx.productTransaction.create({
                        data: {
                            productId: newItem.productId,
                            transactionType: "PURCHASE_RECEIVED",
                            quantityIn: item.currentQuantity,
                            costPrice: item.costPrice,
                            retailPrice: item.retailPrice,
                            userId: userId,
                            sourceModel: "PurchaseItems",
                            sourceId: newItem.id,
                            description: `This Product was added from purchase batch ${updatedPurchase.batchNumber}`,
                            referenceNumber: newItem.batch.referenceNumber,
                        },
                    });
                    yield tx.activityLog.create({
                        data: {
                            userId,
                            model: "PurchaseItems",
                            recordId: newItem.id,
                            action: "CREATE",
                            description: `Created new purchase item for product ID: ${item.productId}`,
                            ipAddress,
                            userAgent,
                        },
                    });
                }
            }
            const hadAnyPurchaseChange = Object.keys(purchaseChanges).length > 0;
            const hadAnyChanges = hadAnyPurchaseChange || hadAnyItemChanges;
            if (hadAnyChanges) {
                // Check if inventory batch exists before attempting to delete
                const existingInventoryBatch = yield tx.inventoryBatch.findUnique({
                    where: {
                        supplierId_batchNumber: {
                            supplierId: currentPurchase.supplierId,
                            batchNumber: currentPurchase.batchNumber,
                        },
                    },
                });
                // Only delete if the inventory batch exists
                if (existingInventoryBatch) {
                    yield tx.inventoryBatch.delete({
                        where: {
                            supplierId_batchNumber: {
                                supplierId: currentPurchase.supplierId,
                                batchNumber: currentPurchase.batchNumber,
                            },
                        },
                    });
                }
            }
            // 5. Return the fully-loaded, updated purchase
            return yield tx.purchase.findUnique({
                where: { id: purchaseId },
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    generic: true,
                                    brand: true,
                                    company: true,
                                },
                            },
                        },
                    },
                    supplier: true,
                    district: true,
                    createdBy: { select: { id: true, fullname: true, email: true } },
                    updatedBy: { select: { id: true, fullname: true, email: true } },
                },
            });
        }));
        return updated;
    }
    catch (err) {
        // Re-throw, so controller's error‐handler can pick it up
        if (err instanceof Error)
            throw new Error(err.message);
        throw err;
    }
    finally {
        yield prisma.$disconnect();
    }
});
exports.updatePurchase = updatePurchase;
