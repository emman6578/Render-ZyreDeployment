import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number | number[];
  brandId?: number;
  companyId?: number;
  genericId?: number;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const products = async (filters: ProductFilters) => {
  const {
    page = 1,
    limit = 10,
    search,
    categoryId,
    brandId,
    companyId,
    genericId,
    isActive,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;
  const skip = (page - 1) * limit;
  const take = limit;

  const where: any = {
    isActive: true,
  };

  // Apply basic filters (excluding search)
  if (categoryId) {
    if (Array.isArray(categoryId)) {
      where.categories = {
        some: {
          id: { in: categoryId },
        },
      };
    } else {
      where.categories = {
        some: {
          id: categoryId,
        },
      };
    }
  }

  if (brandId) where.brandId = brandId;
  if (companyId) where.companyId = companyId;
  if (genericId) where.genericId = genericId;
  if (isActive !== undefined) where.isActive = isActive;

  const validSortFields = [
    "createdAt",
    "updatedAt",
    "averageCostPrice",
    "averageRetailPrice",
    "safetyStock",
    "brandName",
  ];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

  let orderBy: any;
  if (sortField === "brandName") {
    orderBy = {
      brand: {
        name: sortOrder,
      },
    };
  } else {
    orderBy = { [sortField]: sortOrder };
  }

  // Step 1: Fetch all products with basic filters (excluding search)
  const allProducts = await prisma.product.findMany({
    where,
    include: {
      generic: true,
      brand: true,
      categories: true,
      company: true,
      createdBy: { select: { id: true, fullname: true, email: true } },
      updatedBy: { select: { id: true, fullname: true, email: true } },
      _count: { select: { inventoryItems: true } },
    },
  });

  // Step 2: Apply search filter (post-query filtering like inventory service)
  let searched = allProducts;
  if (search) {
    const s = search.toLowerCase();
    searched = allProducts.filter((product) => {
      return (
        product.id.toString().includes(s) ||
        product.generic?.name?.toLowerCase().includes(s) ||
        product.brand?.name?.toLowerCase().includes(s) ||
        product.company?.name?.toLowerCase().includes(s) ||
        product.categories?.some((category) =>
          category.name?.toLowerCase().includes(s)
        ) ||
        product.averageCostPrice?.toString().includes(s) ||
        product.averageRetailPrice?.toString().includes(s) ||
        product.safetyStock?.toString().includes(s)
      );
    });
  }

  // Step 3: Apply sorting
  if (sortField && validSortFields.includes(sortField)) {
    searched.sort((a, b) => {
      if (sortField === "brandName") {
        const aName = a.brand?.name || "";
        const bName = b.brand?.name || "";
        return sortOrder === "asc"
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      } else {
        const aValue = a[sortField as keyof typeof a];
        const bValue = b[sortField as keyof typeof b];

        if (aValue === null || bValue === null) return 0;

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
        }

        if (aValue instanceof Date && bValue instanceof Date) {
          return sortOrder === "asc"
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        }

        return 0;
      }
    });
  }

  // Step 4: Paginate
  const totalItems = searched.length;
  const totalPages = Math.ceil(totalItems / take);
  const paginated = searched.slice(skip, skip + take);

  const pagination = {
    currentPage: page,
    totalPages,
    totalItems,
    itemsPerPage: take,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  // Step 5: Get additional data for summary calculations
  const [totalCount, inventoryData] = await Promise.all([
    prisma.product.count({ where }),
    prisma.inventoryItem.findMany({
      where: {
        product: where,
        status: "ACTIVE",
      },
      include: {
        product: {
          select: {
            id: true,
            averageCostPrice: true,
            averageRetailPrice: true,
            safetyStock: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const summary = {
    // ... all the summary calculations remain the same
    statusBreakdown: {
      activeProducts: searched.filter((p) => p.isActive).length,
      inactiveProducts: searched.filter((p) => !p.isActive).length,
    },
    pricing: {
      totalCostValue: inventoryData.reduce(
        (sum, item) =>
          sum +
          Number(item.product.averageCostPrice ?? 0) * item.initialQuantity,
        0
      ),
      totalRetailValue: inventoryData.reduce(
        (sum, item) =>
          sum +
          Number(item.product.averageRetailPrice ?? 0) * item.initialQuantity,
        0
      ),
      currentCostValue: inventoryData.reduce(
        (sum, item) =>
          sum +
          Number(item.product.averageCostPrice ?? 0) * item.currentQuantity,
        0
      ),
      currentRetailValue: inventoryData.reduce(
        (sum, item) =>
          sum +
          Number(item.product.averageRetailPrice ?? 0) * item.currentQuantity,
        0
      ),
      totalMarkupValue: inventoryData.reduce((sum, item) => {
        const cost = Number(item.product.averageCostPrice ?? 0);
        const retail = Number(item.product.averageRetailPrice ?? 0);
        return sum + (retail - cost) * item.initialQuantity;
      }, 0),
      currentMarkupValue: inventoryData.reduce((sum, item) => {
        const cost = Number(item.product.averageCostPrice ?? 0);
        const retail = Number(item.product.averageRetailPrice ?? 0);
        return sum + (retail - cost) * item.currentQuantity;
      }, 0),
    },
    inventory: {
      totalStockItems: inventoryData.reduce(
        (sum, item) => sum + item.currentQuantity,
        0
      ),
      averageStockPerProduct:
        inventoryData.length > 0
          ? inventoryData.reduce((sum, item) => sum + item.currentQuantity, 0) /
            new Set(inventoryData.map((item) => item.productId)).size
          : 0,
      lowStockProducts: (() => {
        const productStocks = inventoryData.reduce((acc, item) => {
          acc[item.productId] =
            (acc[item.productId] || 0) + item.currentQuantity;
          return acc;
        }, {} as Record<number, number>);

        return Object.entries(productStocks).filter(
          ([productId, totalStock]) => {
            const product = searched.find((p) => p.id === parseInt(productId));
            const safetyStock = product?.safetyStock ?? 10;
            return totalStock < safetyStock;
          }
        ).length;
      })(),
      outOfStockProducts: (() => {
        const productStocks = inventoryData.reduce((acc, item) => {
          acc[item.productId] =
            (acc[item.productId] || 0) + item.currentQuantity;
          return acc;
        }, {} as Record<number, number>);

        return Object.values(productStocks).filter((stock) => stock === 0)
          .length;
      })(),
      productsWithInventory: new Set(
        inventoryData.map((item) => item.productId)
      ).size,
    },
    categoryDistribution: searched.reduce((acc, p) => {
      if (p.categories && p.categories.length > 0) {
        p.categories.forEach((category) => {
          const name = category.name ?? "Uncategorized";
          acc[name] = (acc[name] ?? 0) + 1;
        });
      } else {
        acc["Uncategorized"] = (acc["Uncategorized"] ?? 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
    companyOptions: searched
      .reduce((acc, p) => {
        if (p.company) {
          const existing = acc.find((item) => item.id === p.company!.id);
          if (existing) {
            existing.count++;
          } else {
            acc.push({
              id: p.company.id,
              name: p.company.name,
              count: 1,
            });
          }
        }
        return acc;
      }, [] as Array<{ id: number; name: string; count: number }>)
      .sort((a, b) => a.name.localeCompare(b.name)),
    categoryOptions: searched
      .reduce((acc, p) => {
        if (p.categories && p.categories.length > 0) {
          p.categories.forEach((category) => {
            const existing = acc.find((item) => item.id === category.id);
            if (existing) {
              existing.count++;
            } else {
              acc.push({
                id: category.id,
                name: category.name,
                count: 1,
              });
            }
          });
        }
        return acc;
      }, [] as Array<{ id: number; name: string; count: number }>)
      .sort((a, b) => a.name.localeCompare(b.name)),
    timeAnalysis: {
      productsCreatedToday: searched.filter((p) => {
        const today = new Date().toDateString();
        return new Date(p.createdAt).toDateString() === today;
      }).length,
      productsUpdatedToday: searched.filter((p) => {
        const today = new Date().toDateString();
        return new Date(p.updatedAt).toDateString() === today;
      }).length,
      newestProduct:
        searched.length > 0
          ? searched.reduce((newest, p) =>
              new Date(p.createdAt) > new Date(newest.createdAt) ? p : newest
            ).createdAt
          : null,
      lastUpdated:
        searched.length > 0
          ? searched.reduce((latest, p) =>
              new Date(p.updatedAt) > new Date(latest.updatedAt) ? p : latest
            ).updatedAt
          : null,
    },
    dataQuality: {
      productsWithoutGeneric: searched.filter((p) => !p.generic).length,
      productsWithoutBrand: searched.filter((p) => !p.brand).length,
      productsWithoutCategory: searched.filter(
        (p) => !p.categories || p.categories.length === 0
      ).length,
      productsWithoutCompany: searched.filter((p) => !p.company).length,
      productsWithoutPricing: searched.filter(
        (p) => !p.averageCostPrice || !p.averageRetailPrice
      ).length,
    },
    appliedFilters: {
      hasSearch: Boolean(search),
      categoryFilter: categoryId
        ? Array.isArray(categoryId)
          ? `Category IDs: ${categoryId.join(", ")}`
          : `Category ID: ${categoryId}`
        : null,
      brandFilter: brandId ? `Brand ID: ${brandId}` : null,
      companyFilter: companyId ? `Company ID: ${companyId}` : null,
      genericFilter: genericId ? `Generic ID: ${genericId}` : null,
      statusFilter: isActive !== undefined ? `Active: ${isActive}` : null,
      sortedBy: `${sortField} (${sortOrder})`,
    },
    summaryInfo: {
      basedOnFilteredProducts: searched.length,
      totalProductsInSystem: totalCount,
      filtersApplied: [
        search,
        categoryId,
        brandId,
        companyId,
        genericId,
        isActive,
      ].some((v) => v !== undefined && v !== null),
    },
  };

  return { products: paginated, pagination, summary };
};
