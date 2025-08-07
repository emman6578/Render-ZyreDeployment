import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const inventory_by_id = async (
  id: number,
  page: number = 1,
  limit: number = 10,
  search: string = "",
  sortField: string = "createdAt",
  sortOrder: string = "desc"
) => {
  if (!id || isNaN(id)) {
    throw new Error("Valid inventory ID is required");
  }

  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  // Validate sort field
  const validSortFields = [
    "initialQuantity",
    "currentQuantity",
    "costPrice",
    "retailPrice",
    "createdAt",
    "updatedAt",
  ];

  const validatedSortField = validSortFields.includes(sortField)
    ? sortField
    : "createdAt";
  const validatedSortOrder =
    sortOrder.toLowerCase() === "asc" || sortOrder.toLowerCase() === "desc"
      ? (sortOrder.toLowerCase() as "asc" | "desc")
      : "desc";

  const skip = (page - 1) * limit;

  // First, get the inventory batch without items to check if it exists
  const inventoryBatch = await prisma.inventoryBatch.findUnique({
    where: { id, isActive: true },
    include: {
      supplier: true,
      district: true,
      createdBy: { select: { id: true, fullname: true } },
      updatedBy: { select: { id: true, fullname: true } },
    },
  });

  if (!inventoryBatch) {
    throw new Error("Inventory batch not found");
  }

  // Build search conditions for items
  const searchConditions = search.trim()
    ? {
        OR: [
          // Search in product brand name
          {
            product: {
              brand: {
                name: {
                  contains: search,
                },
              },
            },
          },
          // Search in product generic name
          {
            product: {
              generic: {
                name: {
                  contains: search,
                },
              },
            },
          },
          // Search in product company name
          {
            product: {
              company: {
                name: {
                  contains: search,
                },
              },
            },
          },
          // Search in last update reason
          {
            lastUpdateReason: {
              contains: search,
            },
          },
          // Search in product's last update reason
          {
            product: {
              lastUpdateReason: {
                contains: search,
              },
            },
          },
        ],
      }
    : {};

  const whereCondition = {
    batchId: id,
    ...searchConditions,
  };

  // Get total count of items for this inventory batch (with search filter)
  const totalItems = await prisma.inventoryItem.count({
    where: whereCondition,
  });

  // Get paginated items (with search filter and sorting)
  const items = await prisma.inventoryItem.findMany({
    where: whereCondition,
    include: {
      product: { include: { brand: true, generic: true, company: true } },
      createdBy: { select: { id: true, fullname: true } },
      updatedBy: { select: { id: true, fullname: true } },
    },
    omit: { batchId: true },
    skip,
    take: limit,
    orderBy: { [validatedSortField]: validatedSortOrder },
  });

  // Calculate pagination info
  const totalPages = Math.ceil(totalItems / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const pagination_items_array = {
    currentPage: page,
    totalPages,
    totalItems,
    itemsPerPage: limit,
    hasNextPage,
    hasPreviousPage,
  };

  // Combine inventory batch with paginated items
  const inventory = [
    {
      ...inventoryBatch,
      items,
    },
  ];

  return {
    inventory,
    pagination_items_array,
  };
};
