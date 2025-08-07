import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  omit: {
    inventoryMovement: {
      inventoryItemId: true,
      createdById: true,
    },
  },
});

export interface InventoryMovementQuery {
  search?: string;
  sortField?: string;
  sortOrder?: string;
  page?: string;
  limit?: string;
  movementType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const inventory_movement_list = async (
  page: number = 1,
  limit: number = 10,
  search: string = "",
  sortField?: string,
  sortOrder: "asc" | "desc" = "desc",
  movementType?: string,
  dateFrom?: string,
  dateTo?: string
) => {
  const skip = (page - 1) * limit;

  // Step 1: Build base conditions for database query
  const baseConditions: any = {};

  // Add movement type filter
  if (movementType) {
    baseConditions.movementType = movementType;
  }

  // Add date range filter
  if (dateFrom || dateTo) {
    baseConditions.createdAt = {};
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      baseConditions.createdAt.gte = fromDate;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      baseConditions.createdAt.lte = toDate;
    }
  }

  // Step 2: Fetch everything (with joins)
  const allMovements = await prisma.inventoryMovement.findMany({
    where: baseConditions,
    include: {
      inventoryItem: {
        include: {
          product: {
            select: {
              generic: { select: { name: true } },
              brand: { select: { name: true } },
              categories: { select: { name: true } },
            },
          },
          batch: {
            select: {
              invoiceDate: true,
              expiryDate: true,
              batchNumber: true,
              invoiceNumber: true,
              dt: true,
              supplier: { select: { name: true } },
              district: { select: { name: true } },
            },
          },
        },
      },
      createdBy: { select: { fullname: true } },
    },
  });

  // Step 3: Apply search filter
  const searched = allMovements.filter((movement) => {
    if (!search) return true;

    const s = search.toLowerCase();

    // Search by movement ID
    const searchAsNumber = parseInt(search);
    if (!isNaN(searchAsNumber) && movement.id === searchAsNumber) {
      return true;
    }

    // Search by reason
    if (movement.reason?.toLowerCase().includes(s)) {
      return true;
    }

    // Search by movementType
    if (movement.movementType?.toLowerCase().includes(s)) {
      return true;
    }

    // Search by reference ID
    if (movement.referenceId?.toLowerCase().includes(s)) {
      return true;
    }

    // Search by created by fullname
    if (movement.createdBy?.fullname?.toLowerCase().includes(s)) {
      return true;
    }

    // Search by generic name
    if (
      movement.inventoryItem?.product?.generic?.name?.toLowerCase().includes(s)
    ) {
      return true;
    }

    // Search by brand name
    if (
      movement.inventoryItem?.product?.brand?.name?.toLowerCase().includes(s)
    ) {
      return true;
    }

    // Search by batch number
    if (movement.inventoryItem?.batch?.batchNumber?.toLowerCase().includes(s)) {
      return true;
    }

    // Search by supplier name
    if (
      movement.inventoryItem?.batch?.supplier?.name?.toLowerCase().includes(s)
    ) {
      return true;
    }

    // Search by district name
    if (
      movement.inventoryItem?.batch?.district?.name?.toLowerCase().includes(s)
    ) {
      return true;
    }

    // Search by invoice number
    if (
      movement.inventoryItem?.batch?.invoiceNumber?.toLowerCase().includes(s)
    ) {
      return true;
    }

    // Search by document type (dt)
    if (movement.inventoryItem?.batch?.dt?.toLowerCase().includes(s)) {
      return true;
    }

    return false;
  });

  function calculateSummary(movements: any[]) {
    let stats = {
      totalQuantityMoved: 0,
      totalInbound: 0,
      totalOutbound: 0,
      totalAdjustments: 0,
      totalTransfers: 0,
      inboundCount: 0,
      outboundCount: 0,
      adjustmentCount: 0,
      transferCount: 0,
      otherCount: 0,
      oldestMovement: null as Date | null,
      newestMovement: null as Date | null,
    };

    movements.forEach((movement) => {
      const quantity = Math.abs(movement.quantity || 0);
      const movementType = movement.movementType?.toLowerCase();
      const createdAt = movement.createdAt;

      // Total quantity moved
      stats.totalQuantityMoved += quantity;

      // Categorize movement
      switch (movementType) {
        case "inbound":
        case "purchase":
        case "return":
          stats.totalInbound += quantity;
          stats.inboundCount++;
          break;
        case "outbound":
        case "sale":
        case "dispensed":
          stats.totalOutbound += quantity;
          stats.outboundCount++;
          break;
        case "adjustment":
        case "stock_adjustment":
          stats.totalAdjustments += quantity;
          stats.adjustmentCount++;
          break;
        case "transfer":
          stats.totalTransfers += quantity;
          stats.transferCount++;
          break;
        default:
          stats.otherCount++;
      }

      // Track date range
      if (createdAt) {
        if (!stats.oldestMovement || createdAt < stats.oldestMovement) {
          stats.oldestMovement = createdAt;
        }
        if (!stats.newestMovement || createdAt > stats.newestMovement) {
          stats.newestMovement = createdAt;
        }
      }
    });

    return {
      // Original structure
      totalQuantityMoved: stats.totalQuantityMoved,
      totalInboundQuantity: stats.totalInbound,
      totalOutboundQuantity: stats.totalOutbound,
      totalAdjustmentQuantity: stats.totalAdjustments,
      totalTransferQuantity: stats.totalTransfers,
      inboundCount: stats.inboundCount,
      outboundCount: stats.outboundCount,
      adjustmentCount: stats.adjustmentCount,
      transferCount: stats.transferCount,
      oldestMovement: stats.oldestMovement,
      newestMovement: stats.newestMovement,
      // Calculated field (same as before)
      netMovement: stats.totalInbound - stats.totalOutbound,

      // Optional: Add new metrics without breaking existing consumers
      _meta: {
        otherCount: stats.otherCount, // Hidden from frontend unless requested
      },
    };
  }

  const fullSummary = calculateSummary(searched);

  // Step 4: Sort by specified field
  const allowedSortFields = [
    "id",
    "createdAt",
    "quantity",
    "previousQuantity",
    "newQuantity",
    "movementType",
    "approvalDate",
    "expiryDate",
    "invoiceDate",
  ];

  if (sortField && allowedSortFields.includes(sortField)) {
    searched.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Handle nested sorting for related fields
      switch (sortField) {
        case "expiryDate":
          aValue = a.inventoryItem?.batch?.expiryDate;
          bValue = b.inventoryItem?.batch?.expiryDate;
          break;
        case "invoiceDate":
          aValue = a.inventoryItem?.batch?.invoiceDate;
          bValue = b.inventoryItem?.batch?.invoiceDate;
          break;
        default:
          aValue = a[sortField as keyof typeof a];
          bValue = b[sortField as keyof typeof b];
      }

      // Handle null/undefined values
      if (!aValue && !bValue) return 0;
      if (!aValue) return sortOrder === "asc" ? -1 : 1;
      if (!bValue) return sortOrder === "asc" ? 1 : -1;

      // Handle date fields
      if (
        sortField === "createdAt" ||
        sortField === "approvalDate" ||
        sortField === "expiryDate" ||
        sortField === "invoiceDate"
      ) {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
      }

      // Handle numeric fields
      if (
        sortField === "id" ||
        sortField === "quantity" ||
        sortField === "previousQuantity" ||
        sortField === "newQuantity"
      ) {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }

      // Handle string fields
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (sortOrder === "asc") {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }

  // Step 5: Paginate
  const totalItems = searched.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginated = searched.slice(skip, skip + limit);

  const pagination = {
    currentPage: page,
    totalPages,
    totalItems,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  return {
    movements: paginated,
    pagination,
    summary: fullSummary,
    filters: {
      search,
      sortField,
      sortOrder,
      movementType,
      dateFrom,
      dateTo,
    },
  };
};
