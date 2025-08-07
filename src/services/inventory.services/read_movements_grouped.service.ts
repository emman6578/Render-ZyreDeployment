import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface MovementGroupedByBatchRequest {
  batchNumber?: string;
  referenceNumber?: string;
  batchAndReference?: string; // New parameter for combined filtering
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  movementType?: string; // Filter by movement type
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface StructuredMovementData {
  referenceNumber: string;
  type: string;
  categories: string;
  generic: string;
  brand: string;
  batchNumber: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  balance: number;
  reason: string | null;
  createdBy: string;
  dateCreated: Date;
  isCurrentQuantityChange: boolean;
  isInitialQuantityChange: boolean;
  movementId: number;
  inventoryItemId: number;
  productId: number;
}

export interface MovementTypeCount {
  INBOUND: number;
  OUTBOUND: number;
  ADJUSTMENT: number;
  TRANSFER: number;
  RETURN: number;
  EXPIRED: number;
}

export interface BatchSummary {
  totalMovements: number;
  movementTypeCounts: MovementTypeCount;
  remainingInventory: number;
  uniqueProducts: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  products: {
    generic: string;
    brand: string;
    remainingQuantity: number;
    movementCount: number;
    initialQuantity: number;
    currentQuantity: number;
    costPrice: number;
    retailPrice: number;
    status: string;
  }[];
  beginningInventory: number | null; // Added field for the first INBOUND quantity
  balance: number; // Balance after deducting beginning inventory from remaining inventory
}

export interface MovementGroupedByBatchResponse {
  message: string;
  data: StructuredMovementData[];
  totalMovements: number;
  totalBatches: number;
  batchSummary: BatchSummary[];
  pagination: PaginationInfo;
}

export const getInventoryMovementsGroupedByBatch = async (
  filters: MovementGroupedByBatchRequest
): Promise<MovementGroupedByBatchResponse> => {
  try {
    // Build where clause for filtering
    const whereClause: any = {};

    // Handle combined batch and reference filtering
    if (filters.batchAndReference) {
      whereClause.AND = [
        {
          inventoryItem: {
            batch: {
              batchNumber: filters.batchAndReference,
            },
          },
        },
        {
          referenceId: filters.batchAndReference,
        },
      ];
    } else {
      // Handle separate filtering
      if (filters.batchNumber) {
        whereClause.inventoryItem = {
          batch: {
            batchNumber: filters.batchNumber,
          },
        };
      }

      if (filters.referenceNumber) {
        whereClause.referenceId = filters.referenceNumber;
      }
    }

    // Add movement type filtering
    if (filters.movementType) {
      whereClause.movementType = filters.movementType;
    }

    // Add date range filtering
    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: any = {};

      if (filters.dateFrom) {
        // Set to start of the day (00:00:00)
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        dateFilter.gte = fromDate;
      }

      if (filters.dateTo) {
        // Set to end of the day (23:59:59.999)
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }

      if (Object.keys(dateFilter).length > 0) {
        whereClause.createdAt = dateFilter;
      }
    }

    // Set default pagination values
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await prisma.inventoryMovement.count({
      where: whereClause,
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Fetch all inventory movements with related data
    const movements = await prisma.inventoryMovement.findMany({
      where: whereClause,
      include: {
        inventoryItem: {
          include: {
            batch: {
              select: {
                referenceNumber: true,
                batchNumber: true,
              },
            },
            product: {
              include: {
                generic: {
                  select: {
                    name: true,
                  },
                },
                brand: {
                  select: {
                    name: true,
                  },
                },
                categories: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
      },
      orderBy: [
        {
          inventoryItem: {
            batch: {
              referenceNumber: "asc",
            },
          },
        },
        {
          createdAt: "desc",
        },
      ],
      skip,
      take: limit,
    });

    // Group movements by batch reference number
    const groupedMovements = new Map<string, any[]>();

    movements.forEach((movement) => {
      const referenceNumber = movement.inventoryItem.batch.referenceNumber;
      if (!groupedMovements.has(referenceNumber)) {
        groupedMovements.set(referenceNumber, []);
      }
      groupedMovements.get(referenceNumber)!.push(movement);
    });

    // Process each batch group to calculate balances and structure data
    const structuredData: StructuredMovementData[] = [];
    const batchSummary: BatchSummary[] = [];

    for (const [referenceNumber, batchMovements] of groupedMovements) {
      let remainingInventory = 0;
      const movementTypeCounts: MovementTypeCount = {
        INBOUND: 0,
        OUTBOUND: 0,
        ADJUSTMENT: 0,
        TRANSFER: 0,
        RETURN: 0,
        EXPIRED: 0,
      };
      const dates: Date[] = [];
      const products = new Map<
        string,
        {
          generic: string;
          brand: string;
          remainingQuantity: number;
          movementCount: number;
          initialQuantity: number;
          currentQuantity: number;
          costPrice: number;
          retailPrice: number;
          status: string;
        }
      >();

      // Get current inventory data for this batch
      const currentInventoryItems = await prisma.inventoryItem.findMany({
        where: {
          batch: {
            referenceNumber: referenceNumber,
          },
        },
        include: {
          product: {
            include: {
              generic: {
                select: {
                  name: true,
                },
              },
              brand: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      //  // Find the first INBOUND movement (chronologically last in sortedMovements)
      //  const beginningInventory = sortedMovements
      //  .filter((movement) => movement.movementType === "INBOUND")
      //  .reduce((sum, movement) => sum + (movement.quantity || 0), 0);

      // Calculate beginning inventory from current inventory items' initialQuantity
      const beginningInventory = currentInventoryItems.reduce(
        (sum, item) => sum + (item.initialQuantity || 0),
        0
      );

      // Sort movements by creation date to ensure chronological order (oldest first for balance calculation)
      const sortedMovements = batchMovements.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Calculate running balance chronologically
      let runningBalance = 0;
      const movementsWithBalance = sortedMovements.map((movement) => {
        runningBalance += movement.quantity;

        // Validate for negative balance (might indicate data issues)
        if (runningBalance < 0) {
          console.warn(
            `Warning: Negative balance detected for movement ${movement.id}. Balance: ${runningBalance}, Movement: ${movement.movementType}, Quantity: ${movement.quantity}`
          );
        }

        return {
          ...movement,
          calculatedBalance: runningBalance,
        };
      });

      // Validate final balance matches current inventory
      const finalCalculatedBalance =
        movementsWithBalance[movementsWithBalance.length - 1]
          ?.calculatedBalance || 0;
      const currentInventoryBalance = currentInventoryItems.reduce(
        (sum, item) => sum + item.currentQuantity,
        0
      );

      if (Math.abs(finalCalculatedBalance - currentInventoryBalance) > 0) {
        console.warn(
          `Warning: Balance mismatch detected. Calculated: ${finalCalculatedBalance}, Current Inventory: ${currentInventoryBalance}`
        );
      }

      // Reverse back to newest first for display
      const displayMovements = movementsWithBalance.reverse();

      for (const movement of displayMovements) {
        // Calculate remaining inventory (running balance)
        remainingInventory = movement.calculatedBalance;

        // Count movement types
        if (movement.movementType in movementTypeCounts) {
          movementTypeCounts[
            movement.movementType as keyof MovementTypeCount
          ]++;
        }

        // Track dates
        dates.push(movement.createdAt);

        // Track products
        const productKey = `${movement.inventoryItem.product.generic.name}-${movement.inventoryItem.product.brand.name}`;
        if (!products.has(productKey)) {
          // Find current inventory data for this product
          const currentInventoryItem = currentInventoryItems.find(
            (item) =>
              item.product.generic.name ===
                movement.inventoryItem.product.generic.name &&
              item.product.brand.name ===
                movement.inventoryItem.product.brand.name
          );

          products.set(productKey, {
            generic: movement.inventoryItem.product.generic.name,
            brand: movement.inventoryItem.product.brand.name,
            remainingQuantity: 0,
            movementCount: 0,
            initialQuantity: currentInventoryItem?.initialQuantity || 0,
            currentQuantity: currentInventoryItem?.currentQuantity || 0,
            costPrice: currentInventoryItem?.costPrice.toNumber() || 0,
            retailPrice: currentInventoryItem?.retailPrice.toNumber() || 0,
            status: currentInventoryItem?.status || "UNKNOWN",
          });
        }
        const product = products.get(productKey)!;
        product.remainingQuantity = movement.calculatedBalance; // Use calculated balance
        product.movementCount++;

        // Get categories as comma-separated string
        const categories = movement.inventoryItem.product.categories
          .map((cat: any) => cat.name)
          .join(", ");

        // Determine if this is a current quantity change or initial quantity change
        const isCurrentQuantityChange =
          movement.reason?.includes("Stock adjustment") ||
          movement.reason?.includes("quantity increased") ||
          movement.reason?.includes("quantity decreased");

        const isInitialQuantityChange =
          movement.reason?.includes("Initial quantity correction") ||
          movement.reason?.includes("historical record");

        // Structure the data according to requirements
        const structuredMovement: StructuredMovementData = {
          referenceNumber: movement.referenceId,
          type: movement.movementType,
          categories: categories,
          generic: movement.inventoryItem.product.generic.name,
          brand: movement.inventoryItem.product.brand.name,
          batchNumber: movement.inventoryItem.batch.batchNumber,
          quantity: movement.quantity,
          previousQuantity: movement.previousQuantity,
          newQuantity: movement.newQuantity,
          balance: movement.calculatedBalance, // Use the properly calculated balance
          reason: movement.reason,
          createdBy: movement.createdBy.fullname,
          dateCreated: movement.createdAt,
          // Additional fields for better identification
          isCurrentQuantityChange: isCurrentQuantityChange,
          isInitialQuantityChange: isInitialQuantityChange,
          movementId: movement.id,
          inventoryItemId: movement.inventoryItemId,
          productId: movement.inventoryItem.productId,
        };

        structuredData.push(structuredMovement);
      }

      // Calculate total remaining inventory from current inventory data
      const totalRemainingInventory = currentInventoryItems.reduce(
        (sum, item) => sum + item.currentQuantity,
        0
      );

      // Create batch summary
      const batchSummaryItem: BatchSummary = {
        totalMovements: batchMovements.length,
        movementTypeCounts,
        remainingInventory: totalRemainingInventory, // Use actual current inventory
        uniqueProducts: products.size,
        dateRange: {
          earliest: new Date(Math.min(...dates.map((d) => d.getTime()))),
          latest: new Date(Math.max(...dates.map((d) => d.getTime()))),
        },
        products: Array.from(products.values()),
        beginningInventory, // Add the beginning inventory value
        balance: beginningInventory
          ? totalRemainingInventory - beginningInventory
          : totalRemainingInventory, // Calculate balance
      };

      batchSummary.push(batchSummaryItem);
    }

    return {
      message: "Inventory Movement grouped by batch",
      data: structuredData,
      totalMovements: structuredData.length,
      totalBatches: groupedMovements.size,
      batchSummary: batchSummary,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to get inventory movements grouped by batch: ${error.message}`
      );
    }
    throw new Error(
      "An unexpected error occurred while fetching inventory movements"
    );
  } finally {
    await prisma.$disconnect();
  }
};
