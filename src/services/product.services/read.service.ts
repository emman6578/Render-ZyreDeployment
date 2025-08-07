// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// export interface ProductFilters {
//   page?: number;
//   limit?: number;
//   search?: string;
//   categoryId?: number | number[]; // Updated to handle single ID or array of IDs
//   brandId?: number;
//   companyId?: number;
//   genericId?: number;
//   isActive?: boolean;
//   sortBy?: string;
//   sortOrder?: "asc" | "desc";
// }

// export const products = async (filters: ProductFilters) => {
//   const {
//     page = 1,
//     limit = 10,
//     search,
//     categoryId,
//     brandId,
//     companyId,
//     genericId,
//     isActive,
//     sortBy = "createdAt",
//     sortOrder = "desc",
//   } = filters;

//   const skip = (page - 1) * limit;
//   const take = limit;

//   // Build where clause
//   const where: any = {
//     isActive: true,
//   };

//   if (search) {
//     where.OR = [
//       // NEW: Add product ID search (exact match)
//       { id: isNaN(Number(search)) ? undefined : Number(search) },
//       { generic: { name: { contains: search } } },
//       { brand: { name: { contains: search } } },
//       {
//         categories: {
//           some: {
//             name: { contains: search },
//           },
//         },
//       },
//       { company: { name: { contains: search } } },
//     ].filter(
//       (condition) =>
//         condition.id !== undefined || Object.keys(condition).length > 1
//     ); // Filter out undefined ID conditions
//   }

//   // Handle category filtering for many-to-many relationship
//   if (categoryId) {
//     if (Array.isArray(categoryId)) {
//       // Multiple categories - product must belong to at least one of them
//       where.categories = {
//         some: {
//           id: { in: categoryId },
//         },
//       };
//     } else {
//       // Single category
//       where.categories = {
//         some: {
//           id: categoryId,
//         },
//       };
//     }
//   }

//   if (brandId) where.brandId = brandId;
//   if (companyId) where.companyId = companyId;
//   if (genericId) where.genericId = genericId;
//   if (isActive !== undefined) where.isActive = isActive;

//   // Enforce only these fields for sorting
//   const validSortFields = [
//     "createdAt",
//     "updatedAt",
//     "averageCostPrice",
//     "averageRetailPrice",
//     "safetyStock",
//   ];
//   const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

//   const [products, totalCount, allProducts, inventoryData] = await Promise.all([
//     // Paginated list (unchanged)
//     prisma.product.findMany({
//       where,
//       skip,
//       take,
//       orderBy: { [sortField]: sortOrder },
//       include: {
//         generic: true,
//         brand: true,
//         categories: true,
//         company: true,
//         createdBy: { select: { id: true, fullname: true, email: true } },
//         updatedBy: { select: { id: true, fullname: true, email: true } },
//         _count: { select: { inventoryItems: true } },
//       },
//     }),

//     // Total count for pagination (unchanged)
//     prisma.product.count({ where }),

//     // All products for summary (unchanged)
//     prisma.product.findMany({
//       where,
//       include: {
//         generic: { select: { name: true } },
//         brand: { select: { name: true } },
//         categories: { select: { id: true, name: true } },
//         company: { select: { id: true, name: true } },
//         _count: { select: { inventoryItems: true } },
//       },
//     }),

//     // NEW: Get inventory data for calculations
//     prisma.inventoryItem.findMany({
//       where: {
//         product: where, // Apply same product filters
//         status: "ACTIVE", // Only active inventory
//       },
//       include: {
//         product: {
//           select: {
//             id: true,
//             averageCostPrice: true,
//             averageRetailPrice: true,
//             safetyStock: true,
//           },
//         },
//         batch: {
//           select: {
//             id: true,
//             batchNumber: true,
//             expiryDate: true,
//             status: true,
//           },
//         },
//       },
//     }),
//   ]);

//   // Pagination metadata
//   const pagination = {
//     currentPage: page,
//     totalPages: Math.ceil(totalCount / take),
//     totalItems: totalCount,
//     itemsPerPage: take,
//     hasNextPage: skip + take < totalCount,
//     hasPreviousPage: page > 1,
//   };

//   const summary = {
//     statusBreakdown: {
//       activeProducts: allProducts.filter((p) => p.isActive).length,
//       inactiveProducts: allProducts.filter((p) => !p.isActive).length,
//     },

//     // UPDATED: Pricing calculations using inventory quantities with product prices
//     pricing: {
//       totalCostValue: inventoryData.reduce(
//         (sum, item) =>
//           sum +
//           Number(item.product.averageCostPrice ?? 0) * item.initialQuantity,
//         0
//       ),
//       totalRetailValue: inventoryData.reduce(
//         (sum, item) =>
//           sum +
//           Number(item.product.averageRetailPrice ?? 0) * item.initialQuantity,
//         0
//       ),
//       currentCostValue: inventoryData.reduce(
//         (sum, item) =>
//           sum +
//           Number(item.product.averageCostPrice ?? 0) * item.currentQuantity,
//         0
//       ),
//       currentRetailValue: inventoryData.reduce(
//         (sum, item) =>
//           sum +
//           Number(item.product.averageRetailPrice ?? 0) * item.currentQuantity,
//         0
//       ),
//       totalMarkupValue: inventoryData.reduce((sum, item) => {
//         const cost = Number(item.product.averageCostPrice ?? 0);
//         const retail = Number(item.product.averageRetailPrice ?? 0);
//         return sum + (retail - cost) * item.initialQuantity;
//       }, 0),
//       currentMarkupValue: inventoryData.reduce((sum, item) => {
//         const cost = Number(item.product.averageCostPrice ?? 0);
//         const retail = Number(item.product.averageRetailPrice ?? 0);
//         return sum + (retail - cost) * item.currentQuantity;
//       }, 0),
//     },

//     // UPDATED: Use inventory data for inventory calculations
//     inventory: {
//       totalStockItems: inventoryData.reduce(
//         (sum, item) => sum + item.currentQuantity,
//         0
//       ),
//       averageStockPerProduct:
//         inventoryData.length > 0
//           ? inventoryData.reduce((sum, item) => sum + item.currentQuantity, 0) /
//             new Set(inventoryData.map((item) => item.productId)).size
//           : 0,
//       lowStockProducts: (() => {
//         const productStocks = inventoryData.reduce((acc, item) => {
//           acc[item.productId] =
//             (acc[item.productId] || 0) + item.currentQuantity;
//           return acc;
//         }, {} as Record<number, number>);

//         return Object.entries(productStocks).filter(
//           ([productId, totalStock]) => {
//             const product = allProducts.find(
//               (p) => p.id === parseInt(productId)
//             );
//             const safetyStock = product?.safetyStock ?? 10;
//             return totalStock < safetyStock;
//           }
//         ).length;
//       })(),
//       outOfStockProducts: (() => {
//         const productStocks = inventoryData.reduce((acc, item) => {
//           acc[item.productId] =
//             (acc[item.productId] || 0) + item.currentQuantity;
//           return acc;
//         }, {} as Record<number, number>);

//         return Object.values(productStocks).filter((stock) => stock === 0)
//           .length;
//       })(),
//       productsWithInventory: new Set(
//         inventoryData.map((item) => item.productId)
//       ).size,
//     },

//     // Rest remains unchanged...
//     categoryDistribution: allProducts.reduce((acc, p) => {
//       if (p.categories && p.categories.length > 0) {
//         p.categories.forEach((category) => {
//           const name = category.name ?? "Uncategorized";
//           acc[name] = (acc[name] ?? 0) + 1;
//         });
//       } else {
//         acc["Uncategorized"] = (acc["Uncategorized"] ?? 0) + 1;
//       }
//       return acc;
//     }, {} as Record<string, number>),

//     // Company options for dropdown
//     companyOptions: allProducts
//       .reduce((acc, p) => {
//         if (p.company) {
//           const existing = acc.find((item) => item.id === p.company!.id);
//           if (existing) {
//             existing.count++;
//           } else {
//             acc.push({
//               id: p.company.id,
//               name: p.company.name,
//               count: 1,
//             });
//           }
//         }
//         return acc;
//       }, [] as Array<{ id: number; name: string; count: number }>)
//       .sort((a, b) => a.name.localeCompare(b.name)), // Sort alphabetically
//     // Category options for dropdown
//     categoryOptions: allProducts
//       .reduce((acc, p) => {
//         if (p.categories && p.categories.length > 0) {
//           p.categories.forEach((category) => {
//             const existing = acc.find((item) => item.id === category.id);
//             if (existing) {
//               existing.count++;
//             } else {
//               acc.push({
//                 id: category.id,
//                 name: category.name,
//                 count: 1,
//               });
//             }
//           });
//         }
//         return acc;
//       }, [] as Array<{ id: number; name: string; count: number }>)
//       .sort((a, b) => a.name.localeCompare(b.name)),
//     timeAnalysis: {
//       productsCreatedToday: allProducts.filter((p) => {
//         const today = new Date().toDateString();
//         return new Date(p.createdAt).toDateString() === today;
//       }).length,
//       productsUpdatedToday: allProducts.filter((p) => {
//         const today = new Date().toDateString();
//         return new Date(p.updatedAt).toDateString() === today;
//       }).length,
//       newestProduct:
//         allProducts.length > 0
//           ? allProducts.reduce((newest, p) =>
//               new Date(p.createdAt) > new Date(newest.createdAt) ? p : newest
//             ).createdAt
//           : null,
//       lastUpdated:
//         allProducts.length > 0
//           ? allProducts.reduce((latest, p) =>
//               new Date(p.updatedAt) > new Date(latest.updatedAt) ? p : latest
//             ).updatedAt
//           : null,
//     },
//     dataQuality: {
//       productsWithoutGeneric: allProducts.filter((p) => !p.generic).length,
//       productsWithoutBrand: allProducts.filter((p) => !p.brand).length,
//       productsWithoutCategory: allProducts.filter(
//         (p) => !p.categories || p.categories.length === 0
//       ).length,
//       productsWithoutCompany: allProducts.filter((p) => !p.company).length,
//       productsWithoutPricing: allProducts.filter(
//         (p) => !p.averageCostPrice || !p.averageRetailPrice
//       ).length,
//     },
//     appliedFilters: {
//       hasSearch: Boolean(search),
//       categoryFilter: categoryId
//         ? Array.isArray(categoryId)
//           ? `Category IDs: ${categoryId.join(", ")}`
//           : `Category ID: ${categoryId}`
//         : null,
//       brandFilter: brandId ? `Brand ID: ${brandId}` : null,
//       companyFilter: companyId ? `Company ID: ${companyId}` : null,
//       genericFilter: genericId ? `Generic ID: ${genericId}` : null,
//       statusFilter: isActive !== undefined ? `Active: ${isActive}` : null,
//       sortedBy: `${sortField} (${sortOrder})`,
//     },
//     summaryInfo: {
//       basedOnFilteredProducts: allProducts.length,
//       totalProductsInSystem: totalCount,
//       filtersApplied: [
//         search,
//         categoryId,
//         brandId,
//         companyId,
//         genericId,
//         isActive,
//       ].some((v) => v !== undefined && v !== null),
//     },
//   };

//   return { products, pagination, summary };
// };

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

  // FIXED: Rewritten search logic to be more robust and avoid the faulty filter.
  if (search) {
    const searchConditions = [
      { generic: { name: { contains: search } } },
      { brand: { name: { contains: search } } },
      {
        categories: {
          some: {
            name: { contains: search },
          },
        },
      },
      { company: { name: { contains: search } } },
    ];

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
