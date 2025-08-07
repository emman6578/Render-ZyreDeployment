import { PrismaClient, InventoryStatus } from "@prisma/client";
const prisma = new PrismaClient();

export const inventory_list = async (
  page: number = 1,
  limit: number = 10,
  search: string = "",
  sortField?: string,
  sortOrder: "asc" | "desc" = "desc",
  status?: string, // NEW: Filter for batch status
  dateFrom?: string,
  dateTo?: string
) => {
  const skip = (page - 1) * limit;

  // Helper function to build status filter conditions
  const buildStatusFilter = (statusParam?: string) => {
    if (!statusParam || statusParam.toLowerCase() === "all") {
      return undefined; // No filter - return all statuses
    }

    // Check if it's a valid InventoryStatus enum value
    const validStatuses = Object.values(InventoryStatus);
    const upperStatus = statusParam.toUpperCase() as InventoryStatus;

    if (validStatuses.includes(upperStatus)) {
      return upperStatus;
    }

    return undefined; // Invalid status, no filter
  };

  // Build filter conditions
  const batchStatusFilter = buildStatusFilter(status);
  // const itemStatusFilter = buildStatusFilter(itemStatus);

  // Build the where clause for batch filtering
  const batchWhereClause: any = {
    isActive: true,
  };

  // Add batch status filter if provided
  if (batchStatusFilter) {
    batchWhereClause.status = batchStatusFilter;
  }

  // Add date range filter if provided
  if (dateFrom || dateTo) {
    batchWhereClause.createdAt = {};

    if (dateFrom) {
      // Set to start of the day (00:00:00)
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      batchWhereClause.createdAt.gte = fromDate;
    }

    if (dateTo) {
      // Set to end of the day (23:59:59.999)
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      batchWhereClause.createdAt.lte = toDate;
    }
  }

  // Step 1: Fetch everything (with joins and filters)
  const allInventories = await prisma.inventoryBatch.findMany({
    where: batchWhereClause,
    include: {
      supplier: { select: { name: true } },
      district: { select: { name: true, code: true } },
      createdBy: { select: { fullname: true } },
      updatedBy: { select: { fullname: true } },
      items: {
        // Filter items by status if specified
        // where: itemStatusFilter ? { status: itemStatusFilter } : undefined,
        select: {
          id: true,
          initialQuantity: true,
          currentQuantity: true,
          costPrice: true,
          retailPrice: true,
          status: true,
          product: {
            select: {
              generic: { select: { name: true } },
              brand: { select: { name: true } },
              image: true,
              safetyStock: true,
              categories: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  // Step 2: Apply search filter
  const searched = allInventories.filter((inv) => {
    const s = search.toLowerCase();

    // Check if any item's product matches the search
    const productMatches = inv.items.some(
      (item) =>
        item.product.generic?.name?.toLowerCase().includes(s) ||
        item.product.brand?.name?.toLowerCase().includes(s)
    );

    return (
      inv.batchNumber?.toLowerCase().includes(s) ||
      inv.supplier?.name?.toLowerCase().includes(s) ||
      inv.district?.name?.toLowerCase().includes(s) ||
      inv.district?.code?.toLowerCase().includes(s) ||
      inv.dt?.toLowerCase().includes(s) ||
      inv.invoiceNumber?.toLowerCase().includes(s) ||
      inv.receivedBy?.toLowerCase().includes(s) ||
      inv.verifiedBy?.toLowerCase().includes(s) ||
      productMatches ||
      inv.referenceNumber?.toLowerCase().includes(s)
    );
  });

  // Step 3: Sort by a date field if specified
  const allowedSortFields = [
    "invoiceDate",
    "expiryDate",
    "manufacturingDate",
    "createdAt",
    "updatedAt",
    "verificationDate",
    "currentQuantity",
  ];

  if (sortField && allowedSortFields.includes(sortField)) {
    searched.sort((a, b) => {
      if (sortField === "currentQuantity") {
        // Sum up current quantity for each inventory batch
        const aTotalQty = a.items.reduce(
          (sum, item) => sum + (item.currentQuantity ?? 0),
          0
        );
        const bTotalQty = b.items.reduce(
          (sum, item) => sum + (item.currentQuantity ?? 0),
          0
        );

        return sortOrder === "asc"
          ? aTotalQty - bTotalQty
          : bTotalQty - aTotalQty;
      } else {
        // Existing date field sorting logic
        const aDate = a[sortField as keyof typeof a] as Date;
        const bDate = b[sortField as keyof typeof b] as Date;

        if (!aDate || !bDate) return 0;
        return sortOrder === "asc"
          ? new Date(aDate).getTime() - new Date(bDate).getTime()
          : new Date(bDate).getTime() - new Date(aDate).getTime();
      }
    });
  }

  // Step 4: Paginate
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

  // Step 5: Build summary object based on the paginated list

  let totalCurrentQuantity = 0;
  let totalCostValue = 0;
  let totalRetailValue = 0;
  let totalConsumedQuantity = 0;
  let totalOriginalQuantity = 0;
  let totalOriginalCostValue = 0;
  let totalOriginalRetailValue = 0;

  for (const inv of paginated) {
    inv.items.forEach((it) => {
      const initQty = it.initialQuantity ?? 0;
      const currQty = it.currentQuantity ?? 0;
      const costP = it.costPrice ?? 0;
      const retailP = it.retailPrice ?? 0;
      const consumed = initQty - currQty;
      const markupUnit = Number(retailP) - Number(costP);

      // Raw totals
      totalCurrentQuantity += currQty;
      totalCostValue += Number(currQty) * Number(costP);
      totalRetailValue += currQty * Number(retailP);

      // Original totals
      totalOriginalQuantity += initQty;
      totalOriginalCostValue += Number(initQty) * Number(costP);
      totalOriginalRetailValue += initQty * Number(retailP);

      // Additional metrics
      totalConsumedQuantity += consumed;
    });
  }

  const summary = {
    totalCurrentQuantity,
    totalCostValue,
    totalRetailValue,
    totalConsumedQuantity,
    totalOriginalQuantity,
    totalOriginalCostValue,
    totalOriginalRetailValue,
  };

  return { inventories: paginated, pagination, summary };
};
