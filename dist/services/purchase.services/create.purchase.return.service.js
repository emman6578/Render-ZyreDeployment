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
exports.purchase_return_create = void 0;
const client_1 = require("@prisma/client");
const generateRefNumber_1 = require("@utils/reference number/generateRefNumber");
const prisma = new client_1.PrismaClient();
const purchase_return_create = (data, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { originalPurchaseId, originalPurchaseItemId, returnQuantity, returnReason, notes, approvedById, } = data;
        // ─── VALIDATION CHECKS ──────────────────────────────────────────────────
        if (!originalPurchaseId) {
            throw new Error("Original purchase ID is required");
        }
        if (!originalPurchaseItemId) {
            throw new Error("Original purchase item ID is required");
        }
        if (!returnQuantity || returnQuantity <= 0) {
            throw new Error("Return quantity must be greater than 0");
        }
        if (!returnReason || returnReason.trim() === "") {
            throw new Error("Return reason is required");
        }
        if (!userId) {
            throw new Error("User authentication required");
        }
        // ─── BUSINESS LOGIC VALIDATION ──────────────────────────────────────────
        // Verify that the original purchase exists
        const originalPurchase = yield prisma.purchase.findUnique({
            where: { id: originalPurchaseId },
            include: {
                items: true,
            },
        });
        if (!originalPurchase) {
            throw new Error("Original purchase not found");
        }
        // Verify that the original purchase item exists and belongs to the purchase
        const originalPurchaseItem = yield prisma.purchaseItems.findUnique({
            where: { id: originalPurchaseItemId },
            include: {
                batch: true,
                product: true,
            },
        });
        if (!originalPurchaseItem) {
            throw new Error("Original purchase item not found");
        }
        if (originalPurchaseItem.batchId !== originalPurchaseId) {
            throw new Error("Purchase item does not belong to the specified purchase");
        }
        // Status-based logic: Check if purchase is in a valid state for returns
        if (originalPurchase.status !== "ACTIVE") {
            throw new Error(`Cannot return items from ${originalPurchase.status.toLowerCase()} purchase`);
        }
        // Verify that the authenticated user exists (additional safety check)
        const processingUser = yield prisma.user.findUnique({
            where: { id: userId },
        });
        if (!processingUser) {
            throw new Error("Authenticated user not found in database");
        }
        // If approvedById is provided, verify that the approving user exists
        if (approvedById) {
            const approvingUser = yield prisma.user.findUnique({
                where: { id: approvedById },
            });
            if (!approvingUser) {
                throw new Error("Approving user not found");
            }
        }
        // Check if return quantity doesn't exceed current quantity
        if (returnQuantity > originalPurchaseItem.currentQuantity) {
            throw new Error(`Return quantity (${returnQuantity}) cannot exceed current quantity (${originalPurchaseItem.currentQuantity})`);
        }
        // Check if there are already existing returns for this item
        const existingReturns = yield prisma.purchaseReturn.aggregate({
            where: {
                originalPurchaseItemId: originalPurchaseItemId,
                status: {
                    in: ["PENDING", "APPROVED", "PROCESSED"],
                },
            },
            _sum: {
                returnQuantity: true,
            },
        });
        // Check for duplicate requests - same user, same item, same quantity, same reason within last 5 minutes
        const recentDuplicateReturn = yield prisma.purchaseReturn.findFirst({
            where: {
                originalPurchaseItemId: originalPurchaseItemId,
                returnQuantity: returnQuantity,
                returnReason: returnReason.trim(),
                processedById: userId,
                createdAt: {
                    gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
                },
                status: {
                    in: ["PENDING", "APPROVED", "PROCESSED"],
                },
            },
        });
        if (recentDuplicateReturn) {
            throw new Error("Duplicate return request detected. A similar return with the same quantity and reason was already submitted recently.");
        }
        const totalReturnedQuantity = existingReturns._sum.returnQuantity || 0;
        const availableForReturn = originalPurchaseItem.initialQuantity - totalReturnedQuantity;
        if (returnQuantity > availableForReturn) {
            throw new Error(`Return quantity (${returnQuantity}) exceeds available quantity for return (${availableForReturn}) All quantity from the initial quantity of this item/s are now marked as returned.`);
        }
        const calculatedReturnPrice = Number(originalPurchaseItem.costPrice) * returnQuantity;
        // ─── MAIN TRANSACTIONAL LOGIC ──────────────────────────────────────────
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const referenceNumber = yield (0, generateRefNumber_1.generateRefNumber)(prisma, 6, "PR");
            // Create the purchase return
            const purchaseReturn = yield tx.purchaseReturn.create({
                data: {
                    referenceNumber,
                    originalPurchaseId,
                    originalPurchaseItemId,
                    returnQuantity,
                    returnPrice: calculatedReturnPrice,
                    returnReason: `Purchase Return: ${returnReason.trim()}`,
                    notes: (notes === null || notes === void 0 ? void 0 : notes.trim()) || null,
                    processedById: userId,
                    approvedById: approvedById || null,
                    status: approvedById ? "APPROVED" : "PENDING",
                },
                include: {
                    originalPurchase: {
                        include: {
                            supplier: true,
                            district: true,
                        },
                    },
                    originalPurchaseItem: {
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
                    processedBy: {
                        select: {
                            id: true,
                            fullname: true,
                            email: true,
                        },
                    },
                    approvedBy: {
                        select: {
                            id: true,
                            fullname: true,
                            email: true,
                        },
                    },
                },
            });
            // // Update the purchase item to reduce current quantity
            // const updatedPurchaseItem = await tx.purchaseItems.update({
            //   where: { id: originalPurchaseItemId },
            //   data: {
            //     currentQuantity: {
            //       decrement: returnQuantity,
            //     },
            //     updatedBy: {
            //       connect: { id: userId },
            //     },
            //     lastUpdateReason: `Quantity reduced due to return: ${returnReason}`,
            //   },
            // });
            // ─── NEW: INVENTORY SYNCHRONIZATION LOGIC ──────────────────────────────
            // 1. Check if this purchase batchNumber exists in Inventory
            // const inventoryBatch = await tx.inventoryBatch.findFirst({
            //   where: {
            //     batchNumber: originalPurchase.batchNumber,
            //     supplierId: originalPurchase.supplierId,
            //   },
            //   include: {
            //     items: {
            //       include: {
            //         product: true,
            //       },
            //     },
            //   },
            // });
            // let inventoryUpdated = false;
            // let inventoryUpdateDetails = null;
            // if (inventoryBatch) {
            //   // 2. Find the specific inventory item that matches the returned product
            //   const matchingInventoryItem = inventoryBatch.items.find(
            //     (item) => item.productId === originalPurchaseItem.productId
            //   );
            //   if (matchingInventoryItem) {
            //     // 3. Check if inventory has enough quantity to deduct
            //     if (matchingInventoryItem.currentQuantity < returnQuantity) {
            //       throw new Error(
            //         `Cannot process return: Inventory has insufficient quantity. ` +
            //           `Available in inventory: ${matchingInventoryItem.currentQuantity}, ` +
            //           `Return quantity: ${returnQuantity}`
            //       );
            //     }
            //     // 4. Deduct the return quantity from inventory
            //     const updatedInventoryItem = await tx.inventoryItem.update({
            //       where: { id: matchingInventoryItem.id },
            //       data: {
            //         currentQuantity: {
            //           decrement: returnQuantity,
            //         },
            //         updatedBy: {
            //           connect: { id: userId },
            //         },
            //         lastUpdateReason: `Quantity reduced due to purchase return: ${returnReason}`,
            //       },
            //     });
            //     // 5. Create inventory movement record
            //     await tx.inventoryMovement.create({
            //       data: {
            //         inventoryItemId: matchingInventoryItem.id,
            //         movementType: "RETURN",
            //         quantity: -returnQuantity, // Negative for outbound
            //         reason: `Purchase return: ${returnReason}`,
            //         referenceId: referenceNumber, // Reference to purchase return
            //         createdById: userId,
            //         previousQuantity: matchingInventoryItem.currentQuantity,
            //         newQuantity: updatedInventoryItem.currentQuantity,
            //         approvedBy: processingUser.fullname,
            //         approvalDate: new Date(),
            //       },
            //     });
            //     inventoryUpdated = true;
            //     inventoryUpdateDetails = {
            //       inventoryItemId: matchingInventoryItem.id,
            //       previousQuantity: matchingInventoryItem.currentQuantity,
            //       newQuantity: updatedInventoryItem.currentQuantity,
            //       quantityDeducted: returnQuantity,
            //     };
            //     // 6. Check if inventory item should be marked as SOLD_OUT
            //     if (updatedInventoryItem.currentQuantity === 0) {
            //       await tx.inventoryItem.update({
            //         where: { id: matchingInventoryItem.id },
            //         data: {
            //           status: "SOLD_OUT",
            //           lastUpdateReason: `Status changed to SOLD_OUT due to purchase return`,
            //         },
            //       });
            //     }
            //   } else {
            //     // Product not found in inventory - this might be expected if inventory was never created
            //     console.warn(
            //       `Product ${originalPurchaseItem.productId} not found in inventory batch ${inventoryBatch.batchNumber}. ` +
            //         `This might be normal if inventory was never added for this purchase.`
            //     );
            //   }
            // } else {
            //   // No matching inventory batch found - this might be expected
            //   console.warn(
            //     `No inventory batch found for batchNumber: ${originalPurchase.batchNumber}, supplierId: ${originalPurchase.supplierId}. ` +
            //       `This might be normal if inventory was never added for this purchase.`
            //   );
            // }
            // Create purchase edit log
            // await tx.purchaseEdit.create({
            //   data: {
            //     editType: "PURCHASE_ITEM",
            //     purchaseItemId: originalPurchaseItemId,
            //     batchNumber: originalPurchase.batchNumber,
            //     action: "UPDATE",
            //     changedFields: {
            //       currentQuantity: {
            //         old: updatedPurchaseItem.currentQuantity + returnQuantity,
            //         new: updatedPurchaseItem.currentQuantity,
            //       },
            //     },
            //     reason: `Purchase return: ${returnReason}`,
            //     description:
            //       `Reduced quantity by ${returnQuantity} units due to return` +
            //       (inventoryUpdated ? ` and synchronized with inventory` : ""),
            //     editedById: userId,
            //   },
            // });
            // Verify the quantity didn't go below zero after the update
            // if (updatedPurchaseItem.currentQuantity < 0) {
            //   throw new Error(
            //     `Transaction would result in negative quantity (${updatedPurchaseItem.currentQuantity}). Return quantity exceeds available stock.`
            //   );
            // }
            return {
                purchaseReturn,
                // updatedPurchaseItem,
                // inventoryUpdated,
                // inventoryUpdateDetails,
            };
        }));
        const {} = result;
        // ─── FORMAT RESPONSE ────────────────────────────────────────────────────
        // const createdPurchaseReturn: CreatedPurchaseReturn = {
        //   id: purchaseReturn.id,
        //   returnQuantity: purchaseReturn.returnQuantity,
        //   returnPrice: purchaseReturn.returnPrice.toNumber(),
        //   returnReason: purchaseReturn.returnReason,
        //   status: purchaseReturn.status,
        //   returnDate: purchaseReturn.returnDate,
        //   notes: purchaseReturn.notes,
        //   refundAmount: purchaseReturn.refundAmount?.toNumber() || null,
        //   originalPurchase: {
        //     id: purchaseReturn.originalPurchase.id,
        //     batchNumber: purchaseReturn.originalPurchase.batchNumber,
        //     invoiceNumber: purchaseReturn.originalPurchase.invoiceNumber ?? "N/A",
        //     supplier: purchaseReturn.originalPurchase.supplier.name,
        //     district: purchaseReturn.originalPurchase.district.name,
        //   },
        //   product: {
        //     id: purchaseReturn.originalPurchaseItem.product.id,
        //     generic: purchaseReturn.originalPurchaseItem.product.generic.name,
        //     brand: purchaseReturn.originalPurchaseItem.product.brand.name,
        //     company: purchaseReturn.originalPurchaseItem.product.company.name,
        //   },
        //   updatedQuantity: {
        //     previousQuantity: updatedPurchaseItem.currentQuantity + returnQuantity,
        //     newQuantity: updatedPurchaseItem.currentQuantity,
        //     quantityReduced: returnQuantity,
        //   },
        //   processedBy: purchaseReturn.processedBy,
        //   approvedBy: purchaseReturn.approvedBy,
        //   createdAt: purchaseReturn.createdAt,
        //   updatedAt: purchaseReturn.updatedAt,
        // };
        const createdPurchaseReturn = {
            message: "Create Purchase Success",
        };
        return createdPurchaseReturn;
    }
    catch (error) {
        throw new Error(error);
    }
    finally {
        yield prisma.$disconnect();
    }
});
exports.purchase_return_create = purchase_return_create;
