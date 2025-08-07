import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({
  omit: {
    purchase: {
      referenceNumber: true,
      createdById: true,
      updatedById: true,
      isActive: true,
    },
    purchaseItems: {
      batchId: true,
      productId: true,
      createdById: true,
      updatedById: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastUpdateReason: true,
    },
  },
});

export const purchase_list_to_inventory = async (
  page: number = 1,
  limit: number = 10,
  search: string = "",
  sortField?: string,
  sortOrder: "asc" | "desc" = "desc"
) => {
  const skip = (page - 1) * limit;

  // Step 1: Get all existing inventory batches to compare against
  const existingInventoryBatches = await prisma.inventoryBatch.findMany({
    select: {
      batchNumber: true,
      supplierId: true,
      // You might want to include other fields for comparison
      // depending on your business logic
    },
  });

  // Create a Set for faster lookup
  const existingBatchKeys = new Set(
    existingInventoryBatches.map(
      (batch) => `${batch.supplierId}-${batch.batchNumber}`
    )
  );

  // Step 2: Fetch all purchases (with joins)
  const allPurchases = await prisma.purchase.findMany({
    where: {
      AND: [
        { verifiedBy: { not: null } },
        { verificationDate: { not: null } },
        { status: "ACTIVE" }, // ADDED: Only show ACTIVE purchases
      ],
    },
    include: {
      supplier: { select: { id: true, name: true } },
      district: { select: { id: true, name: true, code: true } },
      createdBy: { select: { id: true, fullname: true } },
      updatedBy: { select: { id: true, fullname: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              generic: true,
              brand: true,
              categories: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  // Step 3: Filter out purchases that already exist in inventory
  const unconvertedPurchases = allPurchases.filter((purchase) => {
    const purchaseKey = `${purchase.supplierId}-${purchase.batchNumber}`;
    return !existingBatchKeys.has(purchaseKey);
  });

  // Step 4: Apply search filter
  const searched = unconvertedPurchases.filter((purchase) => {
    const s = search.toLowerCase();

    const isExpired =
      purchase.expiryDate && new Date(purchase.expiryDate) < new Date();

    // Exclude expired batches
    if (isExpired) {
      return false;
    }

    return (
      purchase.batchNumber?.toLowerCase().includes(s) ||
      purchase.supplier?.name?.toLowerCase().includes(s) ||
      purchase.district?.name?.toLowerCase().includes(s) ||
      purchase.district?.code?.toLowerCase().includes(s) ||
      purchase.dt?.toLowerCase().includes(s) ||
      purchase.invoiceNumber?.toLowerCase().includes(s) ||
      purchase.receivedBy?.toLowerCase().includes(s) ||
      purchase.verifiedBy?.toLowerCase().includes(s)
    );
  });

  // Step 5: Sort by a date field if specified
  const allowedSortFields = [
    "invoiceDate",
    "expiryDate",
    "manufacturingDate",
    "createdAt",
    "updatedAt",
    "verificationDate",
  ];

  if (sortField && allowedSortFields.includes(sortField)) {
    searched.sort((a, b) => {
      const aDate = a[sortField as keyof typeof a] as Date;
      const bDate = b[sortField as keyof typeof b] as Date;

      if (!aDate || !bDate) return 0;
      return sortOrder === "asc"
        ? new Date(aDate).getTime() - new Date(bDate).getTime()
        : new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  } else {
    // Default sort by createdAt desc
    searched.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Step 6: Paginate
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

  return { purchases: paginated, pagination };
};
