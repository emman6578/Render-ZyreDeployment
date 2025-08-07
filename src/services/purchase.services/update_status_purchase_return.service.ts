import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface UpdateStatusParams {
  returnId: number; // Changed from string to number
  status: string;
  notes?: string;
  userId: number; // Changed from string to number
  ipAddress?: string;
  userAgent?: string;
}

interface ServiceResponse {
  purchaseReturn: {
    id: number; // Changed from string to number
    referenceNumber: string;
    status: string;
    returnQuantity: number;
    returnPrice: number;
    returnReason: string;
    notes: string | null;
    originalPurchase: {
      id: number; // Changed from string to number
      batchNumber: string;
      invoiceNumber: string;
      supplier: string;
      district: string;
    };
    product: {
      id: number; // Changed from string to number
      generic: string;
      brand: string;
      company: string;
    };
    processedBy: any;
    approvedBy: any;
    updatedAt: Date;
    updatedQuantity?: {
      previousQuantity: number;
      newQuantity: number;
      quantityReduced: number;
    };
    inventoryUpdate?: {
      inventoryItemId: number; // Changed from string to number
      previousQuantity: number;
      newQuantity: number;
      quantityDeducted: number;
    };
  };
}

export const update_status_purchase_return_service = async ({
  returnId,
  status,
  notes,
  userId,
  ipAddress,
  userAgent,
}: UpdateStatusParams): Promise<ServiceResponse> => {
  // ─── VALIDATION CHECKS ──────────────────────────────────────────────────
  if (!returnId) {
    throw new Error("Return ID is required");
  }

  if (!status) {
    throw new Error("Status is required");
  }

  if (!userId) {
    throw new Error("User authentication required");
  }

  // Validate status is one of the allowed values
  const allowedStatuses = [
    "PENDING",
    "APPROVED",
    "PROCESSED",
    "REJECTED",
    "CANCELLED",
  ];
  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
    );
  }

  // ─── FETCH PURCHASE RETURN DATA ─────────────────────────────────────────
  const purchaseReturn = await prisma.purchaseReturn.findUnique({
    where: { id: returnId },
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

  if (!purchaseReturn) {
    throw new Error("Purchase return not found");
  }

  // Check if status change is valid
  if (purchaseReturn.status === status) {
    throw new Error(`Purchase return is already ${status}`);
  }

  // Verify that the authenticated user exists
  const processingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!processingUser) {
    throw new Error("Authenticated user not found in database");
  }

  // ─── STATUS TRANSITION VALIDATION ───────────────────────────────────────
  const allowedTransitions: Record<string, string[]> = {
    PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: ["PROCESSED"], // Once approved, can only move to processed
    PROCESSED: [], // Final status - no changes allowed
    REJECTED: [], // Final status - no changes allowed
    CANCELLED: [], // Final status - no changes allowed
  };

  const currentStatus = purchaseReturn.status;
  const allowedNextStatuses = allowedTransitions[currentStatus] || [];

  if (!allowedNextStatuses.includes(status)) {
    throw new Error(
      `Invalid status transition: Cannot change from ${currentStatus} to ${status}. ` +
        `Allowed transitions from ${currentStatus}: ${
          allowedNextStatuses.length > 0
            ? allowedNextStatuses.join(", ")
            : "None (final status)"
        }`
    );
  }

  // Additional business logic validation for specific transitions
  if (currentStatus === "APPROVED" && status !== "PROCESSED") {
    throw new Error(
      "Approved returns can only be marked as PROCESSED. " +
        "If you need to reverse an approval, please contact a system administrator."
    );
  }

  if (currentStatus === "PROCESSED") {
    throw new Error(
      "Processed returns cannot be modified. All transactions have been completed."
    );
  }

  if (currentStatus === "APPROVED" && status === "APPROVED") {
    throw new Error("Purchase return is already approved");
  }

  // Check if there are any inventory movements already created for this return
  if (currentStatus === "APPROVED" && status !== "PROCESSED") {
    const existingMovements = await prisma.inventoryMovement.findFirst({
      where: {
        referenceId: purchaseReturn.referenceNumber,
        movementType: "RETURN",
      },
    });

    if (existingMovements) {
      throw new Error(
        "Cannot change status: Inventory movements have already been created for this return. " +
          "Reversing this action would require manual inventory adjustment."
      );
    }
  }

  // ─── MAIN TRANSACTIONAL LOGIC ──────────────────────────────────────────
  const result = await prisma.$transaction(async (tx) => {
    // Update the purchase return status
    const updatedPurchaseReturn = await tx.purchaseReturn.update({
      where: { id: returnId },
      data: {
        status: status as any, // Cast to enum type
        approvedById:
          status === "APPROVED" ? userId : purchaseReturn.approvedById,
        notes: notes?.trim() || purchaseReturn.notes,
        updatedAt: new Date(),
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

    let updatedPurchaseItem = null;
    let inventoryUpdated = false;
    let inventoryUpdateDetails = null;

    // ─── EXECUTE DEDUCTIONS ONLY IF STATUS IS APPROVED ─────────────────────
    if (status === "APPROVED") {
      const {
        returnQuantity,
        returnReason,
        originalPurchaseItemId,
        originalPurchaseId,
      } = purchaseReturn;

      // ─── BUSINESS LOGIC VALIDATION FOR APPROVAL ────────────────────────────
      // Check if return quantity doesn't exceed current quantity
      if (
        returnQuantity > purchaseReturn.originalPurchaseItem.currentQuantity
      ) {
        throw new Error(
          `Return quantity (${returnQuantity}) cannot exceed current quantity (${purchaseReturn.originalPurchaseItem.currentQuantity})`
        );
      }

      // Check if there are already other approved returns for this item
      const existingApprovedReturns = await tx.purchaseReturn.aggregate({
        where: {
          originalPurchaseItemId: originalPurchaseItemId,
          status: {
            in: ["APPROVED", "PROCESSED"] as any[], // Cast to enum array
          },
          id: {
            not: returnId, // Exclude current return
          },
        },
        _sum: {
          returnQuantity: true,
        },
      });

      const totalApprovedReturnedQuantity =
        existingApprovedReturns._sum.returnQuantity || 0;
      const availableForReturn =
        purchaseReturn.originalPurchaseItem.initialQuantity -
        totalApprovedReturnedQuantity;

      if (returnQuantity > availableForReturn) {
        throw new Error(
          `Return quantity (${returnQuantity}) exceeds available quantity for return (${availableForReturn}). Total approved returns would exceed initial quantity.`
        );
      }

      // ─── UPDATE PURCHASE ITEM QUANTITY ─────────────────────────────────────
      updatedPurchaseItem = await tx.purchaseItems.update({
        where: { id: originalPurchaseItemId },
        data: {
          currentQuantity: {
            decrement: returnQuantity,
          },
          updatedBy: {
            connect: { id: userId },
          },
          lastUpdateReason: `Quantity reduced due to approved return: ${returnReason}`,
        },
      });

      // ─── CREATE PRODUCT TRANSACTION ────────────────────────────────────────
      await tx.productTransaction.create({
        data: {
          productId: purchaseReturn.originalPurchaseItem.productId,
          transactionType: "RETURN_TO_SUPPLIER",
          quantityOut: returnQuantity, // Since it's a return, we're reducing inventory
          costPrice: purchaseReturn.originalPurchaseItem.costPrice,
          retailPrice: purchaseReturn.originalPurchaseItem.retailPrice,
          userId: userId,
          sourceModel: "PurchaseReturn",
          sourceId: returnId,
          description: `Return to supplier: ${returnReason}. Batch: ${purchaseReturn.originalPurchase.batchNumber}`,
          referenceNumber: purchaseReturn.referenceNumber,
        },
      });

      // ─── INVENTORY SYNCHRONIZATION LOGIC ───────────────────────────────────
      // 1. Check if this purchase batchNumber exists in Inventory
      const inventoryBatch = await tx.inventoryBatch.findFirst({
        where: {
          batchNumber: purchaseReturn.originalPurchase.batchNumber,
          supplierId: purchaseReturn.originalPurchase.supplierId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (inventoryBatch) {
        // 2. Find the specific inventory item that matches the returned product
        const matchingInventoryItem = inventoryBatch.items.find(
          (item) =>
            item.productId === purchaseReturn.originalPurchaseItem.productId
        );

        if (matchingInventoryItem) {
          // 3. Check if inventory has enough quantity to deduct
          if (matchingInventoryItem.currentQuantity < returnQuantity) {
            throw new Error(
              `Cannot process return: Inventory has insufficient quantity. ` +
                `Available in inventory: ${matchingInventoryItem.currentQuantity}, ` +
                `Return quantity: ${returnQuantity}`
            );
          }

          // 4. Deduct the return quantity from inventory
          const updatedInventoryItem = await tx.inventoryItem.update({
            where: { id: matchingInventoryItem.id },
            data: {
              currentQuantity: {
                decrement: returnQuantity,
              },
              updatedBy: {
                connect: { id: userId },
              },
              lastUpdateReason: `Quantity reduced due to approved purchase return: ${returnReason}`,
            },
          });

          // 5. Create inventory movement record
          await tx.inventoryMovement.create({
            data: {
              inventoryItemId: matchingInventoryItem.id,
              movementType: "RETURN",
              quantity: -returnQuantity, // Negative for outbound
              reason: `Purchase return approved`,
              referenceId: purchaseReturn.referenceNumber, // Reference to purchase return
              createdById: userId,
              previousQuantity: matchingInventoryItem.currentQuantity,
              newQuantity: updatedInventoryItem.currentQuantity,
              approvedBy: processingUser.fullname,
              approvalDate: new Date(),
            },
          });

          inventoryUpdated = true;
          inventoryUpdateDetails = {
            inventoryItemId: matchingInventoryItem.id,
            previousQuantity: matchingInventoryItem.currentQuantity,
            newQuantity: updatedInventoryItem.currentQuantity,
            quantityDeducted: returnQuantity,
          };

          // 6. Check if inventory item should be marked as RECALLED
          if (updatedInventoryItem.currentQuantity === 0) {
            await tx.inventoryItem.update({
              where: { id: matchingInventoryItem.id },
              data: {
                status: "RECALLED",
                lastUpdateReason: `Status changed to RECALLED due to approved purchase return`,
              },
            });

            await tx.inventoryBatch.update({
              where: { id: inventoryBatch.id },
              data: {
                status: "RECALLED",
              },
            });
          }
        } else {
          // Product not found in inventory - log warning
          console.warn(
            `Product ${purchaseReturn.originalPurchaseItem.productId} not found in inventory batch ${inventoryBatch.batchNumber}. ` +
              `This might be normal if inventory was never added for this purchase.`
          );
        }
      } else {
        // No matching inventory batch found - log warning
        console.warn(
          `No inventory batch found for batchNumber: ${purchaseReturn.originalPurchase.batchNumber}, supplierId: ${purchaseReturn.originalPurchase.supplierId}. ` +
            `This might be normal if inventory was never added for this purchase.`
        );
      }

      // ─── CREATE PURCHASE EDIT LOG ──────────────────────────────────────────
      await tx.purchaseEdit.create({
        data: {
          editType: "PURCHASE_ITEM",
          referenceNumber: purchaseReturn.originalPurchase.referenceNumber,
          purchaseItemId: originalPurchaseItemId,
          batchNumber: purchaseReturn.originalPurchase.batchNumber,
          action: "UPDATE",
          changedFields: {
            currentQuantity: {
              old: updatedPurchaseItem.currentQuantity + returnQuantity,
              new: updatedPurchaseItem.currentQuantity,
            },
          },
          reason: `Purchase return approved: ${returnReason}`,
          description:
            `Reduced quantity by ${returnQuantity} units due to approved return` +
            (inventoryUpdated ? ` and synchronized with inventory` : ""),
          editedById: userId,
          genericName:
            updatedPurchaseReturn.originalPurchaseItem.product.generic.name,
          brandName:
            updatedPurchaseReturn.originalPurchaseItem.product.brand.name,
        },
      });

      // Verify the quantity didn't go below zero after the update
      if (updatedPurchaseItem.currentQuantity < 0) {
        throw new Error(
          `Transaction would result in negative quantity (${updatedPurchaseItem.currentQuantity}). Return quantity exceeds available stock.`
        );
      }

      // ─── CHECK IF ALL ITEMS IN PURCHASE ARE RETURNED ───────────────────────
      const allPurchaseItems = await tx.purchaseItems.findMany({
        where: { batchId: originalPurchaseId },
        select: { currentQuantity: true },
      });

      const allItemsReturned = allPurchaseItems.every(
        (item) => item.currentQuantity === 0
      );

      if (allItemsReturned) {
        // Update Purchase status to RETURNED
        await tx.purchase.update({
          where: { id: originalPurchaseId },
          data: {
            status: "RETURNED",
            verifiedBy: processingUser.fullname,
            verificationDate: new Date(),
            updatedBy: { connect: { id: userId } },
          },
        });
      }
    }

    return {
      updatedPurchaseReturn,
      updatedPurchaseItem,
      inventoryUpdated,
      inventoryUpdateDetails,
    };
  });

  const {
    updatedPurchaseReturn,
    updatedPurchaseItem,
    inventoryUpdated,
    inventoryUpdateDetails,
  } = result;

  // ─── CREATE ACTIVITY LOGS ──────────────────────────────────────────────
  if (userId) {
    // Log the status update
    await prisma.activityLog.create({
      data: {
        userId: userId,
        model: "PurchaseReturn",
        recordId: returnId,
        action: "UPDATE",
        description:
          `Updated purchase return status from ${purchaseReturn.status} to ${status}` +
          (status === "APPROVED" && updatedPurchaseItem
            ? ` - Deducted ${purchaseReturn.returnQuantity} units from inventory`
            : ""),
        ipAddress: ipAddress,
        userAgent: userAgent,
      },
    });

    // If status was approved, log additional activities
    if (status === "APPROVED" && updatedPurchaseItem) {
      // Log the purchase item quantity update
      await prisma.activityLog.create({
        data: {
          userId: userId,
          model: "PurchaseItems",
          recordId: purchaseReturn.originalPurchaseItemId,
          action: "UPDATE",
          description: `Reduced quantity by ${purchaseReturn.returnQuantity} units due to return approval. New quantity: ${updatedPurchaseItem.currentQuantity}`,
          ipAddress: ipAddress,
          userAgent: userAgent,
        },
      });

      // If inventory was updated, log it
      if (inventoryUpdated && inventoryUpdateDetails) {
        await prisma.activityLog.create({
          data: {
            userId: userId,
            model: "InventoryItem",
            recordId: inventoryUpdateDetails.inventoryItemId,
            action: "UPDATE",
            description: `Reduced inventory quantity by ${inventoryUpdateDetails.quantityDeducted} units due to approved purchase return. New quantity: ${inventoryUpdateDetails.newQuantity}`,
            ipAddress: ipAddress,
            userAgent: userAgent,
          },
        });
      }

      // Check if purchase status was updated to RETURNED
      const updatedPurchase = await prisma.purchase.findUnique({
        where: { id: purchaseReturn.originalPurchaseId },
        select: { status: true },
      });

      if (updatedPurchase?.status === "RETURNED") {
        await prisma.activityLog.create({
          data: {
            userId: userId,
            model: "Purchase",
            recordId: purchaseReturn.originalPurchaseId,
            action: "UPDATE",
            description: `Purchase status updated to RETURNED - all items have been returned`,
            ipAddress: ipAddress,
            userAgent: userAgent,
          },
        });
      }
    }
  }

  // ─── FORMAT RESPONSE ────────────────────────────────────────────────────
  const response: any = {
    id: updatedPurchaseReturn.id,
    referenceNumber: updatedPurchaseReturn.referenceNumber,
    status: updatedPurchaseReturn.status,
    returnQuantity: updatedPurchaseReturn.returnQuantity,
    returnPrice: updatedPurchaseReturn.returnPrice.toNumber(),
    returnReason: updatedPurchaseReturn.returnReason,
    notes: updatedPurchaseReturn.notes,
    originalPurchase: {
      id: updatedPurchaseReturn.originalPurchase.id,
      batchNumber: updatedPurchaseReturn.originalPurchase.batchNumber,
      invoiceNumber:
        updatedPurchaseReturn.originalPurchase.invoiceNumber ?? "N/A",
      supplier: updatedPurchaseReturn.originalPurchase.supplier.name,
      district: updatedPurchaseReturn.originalPurchase.district.name,
    },
    product: {
      id: updatedPurchaseReturn.originalPurchaseItem.product.id,
      generic: updatedPurchaseReturn.originalPurchaseItem.product.generic.name,
      brand: updatedPurchaseReturn.originalPurchaseItem.product.brand.name,
      company: updatedPurchaseReturn.originalPurchaseItem.product.company.name,
    },
    processedBy: updatedPurchaseReturn.processedBy,
    approvedBy: updatedPurchaseReturn.approvedBy,
    updatedAt: updatedPurchaseReturn.updatedAt,
  };

  // Add quantity update info if status was approved
  if (status === "APPROVED" && updatedPurchaseItem) {
    response.updatedQuantity = {
      previousQuantity:
        updatedPurchaseItem.currentQuantity + purchaseReturn.returnQuantity,
      newQuantity: updatedPurchaseItem.currentQuantity,
      quantityReduced: purchaseReturn.returnQuantity,
    };

    if (inventoryUpdated && inventoryUpdateDetails) {
      response.inventoryUpdate = inventoryUpdateDetails;
    }
  }

  return { purchaseReturn: response };
};
