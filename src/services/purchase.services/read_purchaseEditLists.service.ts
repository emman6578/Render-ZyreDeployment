import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  omit: {
    purchaseEdit: {
      id: true,
    },
  },
});

interface PurchaseEditQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortField?: string;
  sortOrder?: string;
}

interface PurchaseEditServiceParams {
  page: string;
  limit: string;
  search: string;
  sortField: string;
  sortOrder: string;
}

export const read_purchaseEditLists_service = async (
  params: PurchaseEditServiceParams
) => {
  const {
    page = "1",
    limit = "10",
    search = "",
    sortField = "editedAt",
    sortOrder = "desc",
  } = params;

  // Parse pagination parameters
  const pageNumber = Math.max(1, parseInt(page, 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNumber - 1) * pageSize;

  // Build search conditions - only for string fields
  const searchConditions = search
    ? {
        OR: [
          {
            batchNumber: {
              contains: search,
            },
          },
          {
            genericName: {
              contains: search,
            },
          },
          {
            brandName: {
              contains: search,
            },
          },
          {
            reason: {
              contains: search,
            },
          },
          {
            description: {
              contains: search,
            },
          },
        ],
      }
    : {};

  // Define sortable fields
  const allowedSortFields = [
    "id",
    "editType",
    "purchaseId",
    "purchaseItemId",
    "batchNumber",
    "genericName",
    "brandName",
    "action",
    "reason",
    "editedById",
    "editedAt",
  ];

  const validSortField = allowedSortFields.includes(sortField)
    ? sortField
    : "editedAt";
  const validSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const orderBy = {
    [validSortField]: validSortOrder,
  };

  try {
    const totalItems = await prisma.purchaseEdit.count({
      where: searchConditions,
    });

    const edits = await prisma.purchaseEdit.findMany({
      where: searchConditions,
      orderBy,
      skip,
      take: pageSize,
      include: {
        editedBy: {
          select: {
            fullname: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    return {
      data: edits,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalItems,
        itemsPerPage: pageSize,
        hasNextPage,
        hasPreviousPage,
      },
    };
  } catch (error: any) {
    throw new Error(`Failed to retrieve purchase edits: ${error.message}`);
  }
};
