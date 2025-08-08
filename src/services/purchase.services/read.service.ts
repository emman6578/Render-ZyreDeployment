import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({
  omit: {
    purchase: {
      createdById: true,
      updatedById: true,
      isActive: true,
    },
    supplier: {
      id: true,
      contact: true,
      address: true,
      isActive: true,
    },
    district: {
      id: true,
      code: true,
      isActive: true,
    },
  },
});

export const purchase_list = async (
  page: number = 1,
  limit: number = 10,
  search: string = "",
  sortField?: string,
  sortOrder: "asc" | "desc" = "desc",
  status: string = "ALL",
  dateFrom?: string,
  dateTo?: string
) => {
  const skip = (page - 1) * limit;

  const isVerificationStatus = status === "VERIFIED" || status === "UNVERIFIED";
  const isAllStatus = status === "ALL" || status === ""; // New: check for "ALL" status

  // Build the where clause conditionally
  let whereClause: any = {};

  // Date filtering
  if (dateFrom || dateTo) {
    whereClause.createdAt = {};
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      whereClause.createdAt.gte = fromDate;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      whereClause.createdAt.lte = toDate;
    }
  }

  if (!isAllStatus) {
    // Only apply status filtering if not "ALL"
    if (isVerificationStatus) {
      // For verification status, we filter by verifiedBy/verificationDate presence
      const statusFilter =
        status === "VERIFIED"
          ? {
              AND: [
                { verifiedBy: { not: null } },
                { verificationDate: { not: null } },
              ],
            }
          : {
              OR: [{ verifiedBy: null }, { verificationDate: null }],
            };

      // Combine date filter with status filter
      if (dateFrom || dateTo) {
        whereClause = {
          AND: [whereClause, statusFilter],
        };
      } else {
        whereClause = statusFilter;
      }
    } else {
      // For regular status, filter by PurchaseStatus enum
      const statusFilter = { status: status as any };

      // Combine date filter with status filter
      if (dateFrom || dateTo) {
        whereClause = {
          AND: [whereClause, statusFilter],
        };
      } else {
        whereClause = statusFilter;
      }
    }
  }
  // If isAllStatus is true and no date filters, whereClause remains empty object {}

  // Step 1: Fetch everything (with joins)
  const allInventories = await prisma.purchase.findMany({
    where: whereClause,
    include: {
      supplier: true,
      district: true,
      createdBy: { select: { fullname: true } },
      updatedBy: { select: { fullname: true } },
      items: {
        select: {
          id: true,
          initialQuantity: true,
          currentQuantity: true,
          costPrice: true,
          retailPrice: true,
          product: {
            select: {
              generic: { select: { name: true } },
              brand: { select: { name: true } },
              image: true,
              categories: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  // Rest of the function remains the same...
  // Step 2: Apply search filter
  const searched = allInventories.filter((inv) => {
    const s = search.toLowerCase();

    return (
      inv.batchNumber?.toLowerCase().includes(s) ||
      inv.supplier?.name?.toLowerCase().includes(s) ||
      inv.district?.name?.toLowerCase().includes(s) ||
      inv.district?.code?.toLowerCase().includes(s) ||
      inv.dt?.toLowerCase().includes(s) ||
      inv.invoiceNumber?.toLowerCase().includes(s) ||
      inv.receivedBy?.toLowerCase().includes(s) ||
      inv.verifiedBy?.toLowerCase().includes(s) ||
      inv.referenceNumber?.toLocaleLowerCase().includes(s)
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
    "unverified",
  ];

  if (sortField && allowedSortFields.includes(sortField)) {
    if (sortField === "unverified") {
      // Special handling for unverified sort
      const unverified = searched.filter(
        (inv) => !inv.verifiedBy && !inv.verificationDate
      );

      unverified.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();

        return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
      });

      searched.length = 0;
      searched.push(...unverified);
    } else {
      // Regular date field sorting
      searched.sort((a, b) => {
        const aDate = a[sortField as keyof typeof a] as Date;
        const bDate = b[sortField as keyof typeof b] as Date;

        if (!aDate || !bDate) return 0;
        return sortOrder === "asc"
          ? new Date(aDate).getTime() - new Date(bDate).getTime()
          : new Date(bDate).getTime() - new Date(aDate).getTime();
      });
    }
  } else {
    // Default sort by createdAt desc
    searched.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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

  // Step 5: Calculate summary for all ACTIVE records, regardless of current filter
  let totalInitialQuantity = 0;
  let totalCurrentQuantity = 0;
  let totalCostValue = 0;
  let totalRetailValue = 0;
  let totalOrigCostValue = 0;
  let totalOrigRetailValue = 0;

  // Fetch all ACTIVE records for summary
  const allActiveInventories = await prisma.purchase.findMany({
    where: { status: "ACTIVE" },
    include: {
      items: true,
    },
  });

  for (const inv of allActiveInventories) {
    inv.items.forEach((it) => {
      const initQty = it.initialQuantity ?? 0;
      const currQty = it.currentQuantity ?? 0;
      const costP = it.costPrice ?? 0;
      const retailP = it.retailPrice ?? 0;

      totalInitialQuantity += initQty;
      totalCurrentQuantity += currQty;
      totalCostValue += Number(currQty) * Number(costP);
      totalRetailValue += currQty * Number(retailP);
      totalOrigCostValue += initQty * Number(costP);
      totalOrigRetailValue += initQty * Number(retailP);
    });
  }

  const summary = {
    totalInitialQuantity,
    totalCurrentQuantity,
    totalCostValue,
    totalRetailValue,
    totalOrigCostValue,
    totalOrigRetailValue,
  };

  return { purchases: paginated, pagination, summary };
};
