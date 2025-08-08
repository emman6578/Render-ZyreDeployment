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

  // Search functionality
  if (search) {
    // Create case variations for better search coverage
    const searchVariations = [
      search,
      search.toLowerCase(),
      search.toUpperCase(),
      search.charAt(0).toUpperCase() + search.slice(1).toLowerCase(), // Title case
    ];

    const searchConditions: any[] = [];

    // Add contains conditions for each variation
    searchVariations.forEach((variation) => {
      searchConditions.push(
        { generic: { name: { contains: variation } } },
        { brand: { name: { contains: variation } } },
        {
          categories: {
            some: {
              name: { contains: variation },
            },
          },
        },
        { company: { name: { contains: variation } } }
      );
    });

    // Only add the ID search condition if the search term is a valid number.
    if (!isNaN(Number(search))) {
      searchConditions.push({ id: Number(search) } as any);
    }

    where.OR = searchConditions;
  }

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
    "brandName", // Added brandName
  ];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

  let orderBy: any;
  if (sortField === "brandName") {
    // For brand name sorting, we need to sort by the related brand's name
    orderBy = {
      brand: {
        name: sortOrder,
      },
    };
  } else {
    // For other fields, use direct sorting
    orderBy = { [sortField]: sortOrder };
  }

  const [products, totalCount, allProducts, inventoryData] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        generic: true,
        brand: true,
        categories: true,
        company: true,
        createdBy: { select: { id: true, fullname: true, email: true } },
        updatedBy: { select: { id: true, fullname: true, email: true } },
        _count: { select: { inventoryItems: true } },
      },
    }),

    prisma.product.count({ where }),

    prisma.product.findMany({
      where,
      include: {
        generic: { select: { name: true } },
        brand: { select: { name: true } },
        categories: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        _count: { select: { inventoryItems: true } },
      },
    }),

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

  const pagination = {
    currentPage: page,
    totalPages: Math.ceil(totalCount / take),
    totalItems: totalCount,
    itemsPerPage: take,
    hasNextPage: skip + take < totalCount,
    hasPreviousPage: page > 1,
  };

  const summary = {
    // ... all the summary calculations remain the same
    statusBreakdown: {
      activeProducts: allProducts.filter((p) => p.isActive).length,
      inactiveProducts: allProducts.filter((p) => !p.isActive).length,
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
            const product = allProducts.find(
              (p) => p.id === parseInt(productId)
            );
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
    categoryDistribution: allProducts.reduce((acc, p) => {
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
    companyOptions: allProducts
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
    categoryOptions: allProducts
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
      productsCreatedToday: allProducts.filter((p) => {
        const today = new Date().toDateString();
        return new Date(p.createdAt).toDateString() === today;
      }).length,
      productsUpdatedToday: allProducts.filter((p) => {
        const today = new Date().toDateString();
        return new Date(p.updatedAt).toDateString() === today;
      }).length,
      newestProduct:
        allProducts.length > 0
          ? allProducts.reduce((newest, p) =>
              new Date(p.createdAt) > new Date(newest.createdAt) ? p : newest
            ).createdAt
          : null,
      lastUpdated:
        allProducts.length > 0
          ? allProducts.reduce((latest, p) =>
              new Date(p.updatedAt) > new Date(latest.updatedAt) ? p : latest
            ).updatedAt
          : null,
    },
    dataQuality: {
      productsWithoutGeneric: allProducts.filter((p) => !p.generic).length,
      productsWithoutBrand: allProducts.filter((p) => !p.brand).length,
      productsWithoutCategory: allProducts.filter(
        (p) => !p.categories || p.categories.length === 0
      ).length,
      productsWithoutCompany: allProducts.filter((p) => !p.company).length,
      productsWithoutPricing: allProducts.filter(
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
      basedOnFilteredProducts: allProducts.length,
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

  return { products, pagination, summary };
};
