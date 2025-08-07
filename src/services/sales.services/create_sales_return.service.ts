import { PrismaClient } from "@prisma/client";
import { generateRefNumber } from "@utils/reference number/generateRefNumber";

const prisma = new PrismaClient();

export interface CreateSalesReturnRequest {
  originalSaleId: number;
  returnQuantity: number;
  returnPrice: number;
  returnReason: string;
  notes?: string;
  restockable?: boolean;
}

export interface CreateSalesReturnParams {
  originalSaleId: number;
  returnQuantity: number;
  returnReason: string;
  notes?: string;
  restockable?: boolean;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface SalesReturnResult {
  salesReturn: {
    id: number;
    referenceNumber: string;
    originalSale: {
      referenceNumber: string;
      productName: string;
      batchNumber: string;
    };
    returnQuantity: number;
    returnPrice: number;
    returnReason: string;
    status: string;
    restockable: boolean;
    processedBy: string;
    createdAt: Date;
  };
}

export const createSalesReturnService = async (
  params: CreateSalesReturnParams
): Promise<SalesReturnResult> => {
  const {
    originalSaleId,
    returnQuantity,
    returnReason,
    notes,
    restockable = true,
    userId,
    ipAddress,
    userAgent,
  } = params;

  // Validation (unchanged)
  if (!userId) {
    throw new Error("User authentication required");
  }

  if (!originalSaleId || !returnQuantity || !returnReason) {
    throw new Error(
      "Original sale ID, return quantity, and return reason are required"
    );
  }

  if (returnQuantity <= 0) {
    throw new Error("Return quantity must be greater than 0");
  }

  // Generate unique reference number outside transaction
  const referenceNumber = await generateRefNumber(prisma, 6, "SR");

  // Use Prisma transaction for data consistency
  return await prisma.$transaction(async (tx) => {
    // Get original sale with all necessary details
    const originalSale = await tx.sales.findUnique({
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

    if (
      originalSale.status !== "ACTIVE" &&
      originalSale.status !== "PARTIALLY_RETURNED"
    ) {
      throw new Error(
        "Cannot create return for sale unless status is ACTIVE or PARTIALLY_RETURNED"
      );
    }

    // Calculate total quantity already returned
    const totalReturnedQuantity = originalSale.returns.reduce(
      (sum, returnItem) => sum + returnItem.returnQuantity,
      0
    );

    // Check if return quantity exceeds available quantity
    const availableQuantity = originalSale.quantity - totalReturnedQuantity;
    if (returnQuantity > availableQuantity) {
      throw new Error(
        `Return quantity (${returnQuantity}) exceeds available quantity (${availableQuantity})`
      );
    }

    // Calculate return price and refund amount
    const returnPrice = originalSale.unitRetailPrice; // Use the final price from the sale
    const refundAmount =
      returnQuantity *
      (typeof returnPrice === "number" ? returnPrice : returnPrice.toNumber()); // Calculate refund automatically

    // Create the sales return (updated with automatic price/refund)
    const salesReturn = await tx.salesReturn.create({
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
    await tx.activityLog.create({
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
  });
};
