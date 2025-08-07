import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface UpdateSalesReturnStatusRequest {
  salesReturnId: number;
  newStatus: "PENDING" | "APPROVED" | "PROCESSED" | "REJECTED" | "CANCELLED";
  notes?: string;
}

export interface UpdateSalesReturnStatusParams {
  salesReturnId: number;
  newStatus: "PENDING" | "APPROVED" | "PROCESSED" | "REJECTED" | "CANCELLED";
  notes?: string;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateSalesReturnStatusResult {
  salesReturn: {
    id: number;
    transactionID: string;
    status: string;
    returnQuantity: number;
    returnPrice: number;
    returnReason: string;
    restockable: boolean;
    refundAmount: number;
    updatedAt: Date;
  };
  updatedModels: {
    productTransaction?: boolean;
    inventoryMovement?: boolean;
    inventoryItem?: boolean;
  };
}

export const updateSalesReturnStatusService = async (
  params: UpdateSalesReturnStatusParams
): Promise<UpdateSalesReturnStatusResult> => {
  const { salesReturnId, newStatus, notes, userId, ipAddress, userAgent } =
    params;

  // Validation
  if (!userId) {
    throw new Error("User authentication required");
  }

  if (!salesReturnId || !newStatus) {
    throw new Error("Sales return ID and new status are required");
  }

  // Use Prisma transaction for data consistency
  return await prisma.$transaction(async (tx) => {
    // Get sales return with all necessary details
    const salesReturn = await tx.salesReturn.findUnique({
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
    if (
      salesReturn.status === "PROCESSED" ||
      salesReturn.status === "CANCELLED"
    ) {
      throw new Error(`Cannot update status from ${salesReturn.status}`);
    }

    // Update sales return status
    const updatedSalesReturn = await tx.salesReturn.update({
      where: { id: salesReturnId },
      data: {
        status: newStatus,
        approvedById:
          newStatus === "APPROVED" || newStatus === "PROCESSED" ? userId : null,
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

    const updatedModels: {
      productTransaction?: boolean;
      inventoryMovement?: boolean;
      inventoryItem?: boolean;
    } = {};

    // Only process related models when status is PROCESSED
    if (newStatus === "PROCESSED") {
      const { originalSale } = updatedSalesReturn;
      const { inventoryItem } = originalSale;

      // Get all returns for this sale to calculate total returned quantity
      const allReturnsForSale = await tx.salesReturn.findMany({
        where: {
          originalSaleId: originalSale.id,
          status: {
            in: ["PENDING", "APPROVED", "PROCESSED"],
          },
        },
      });

      // Calculate total quantity already returned
      const totalReturnedQuantity = allReturnsForSale.reduce(
        (sum, returnItem) => sum + returnItem.returnQuantity,
        0
      );

      // 1. Create Product Transaction
      if (updatedSalesReturn.restockable) {
        const productTransaction = await tx.productTransaction.create({
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
      } else {
        // If not restockable, record as quantityOut since items are being removed from available inventory
        const productTransaction = await tx.productTransaction.create({
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
        const inventoryMovement = await tx.inventoryMovement.create({
          data: {
            inventoryItemId: inventoryItem.id,
            movementType: "RETURN",
            quantity: updatedSalesReturn.returnQuantity, // Positive for return
            reason: `Sales return: ${updatedSalesReturn.returnReason}`,
            referenceId: updatedSalesReturn.transactionID,
            createdById: userId,
            previousQuantity: inventoryItem.currentQuantity,
            newQuantity:
              inventoryItem.currentQuantity + updatedSalesReturn.returnQuantity,
            ipAddress,
            userAgent,
          },
        });

        updatedModels.inventoryMovement = true;
      } else {
        // If not restockable, negative quantity (items being removed from available inventory)
        const inventoryMovement = await tx.inventoryMovement.create({
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
        await tx.inventoryItem.update({
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
        await tx.sales.update({
          where: { id: originalSale.id },
          data: {
            status: "PARTIALLY_RETURNED",
            updatedBy: { connect: { id: userId } },
          },
        });
      } else if (totalReturnedQuantity === originalSale.quantity) {
        await tx.sales.update({
          where: { id: originalSale.id },
          data: {
            status: "RETURNED",
            updatedBy: { connect: { id: userId } },
          },
        });
      }
    }

    // Log the activity
    await tx.activityLog.create({
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
        refundAmount: updatedSalesReturn.refundAmount?.toNumber() || 0,
        updatedAt: updatedSalesReturn.updatedAt,
      },
      updatedModels,
    };
  });
};
