"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.products = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const products = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, search, categoryId, brandId, companyId, genericId, isActive, sortBy = "createdAt", sortOrder = "desc", } = filters;
    const skip = (page - 1) * limit;
    const take = limit;
    const where = {
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
        }
        else {
            where.categories = {
                some: {
                    id: categoryId,
                },
            };
        }
    }
    if (brandId)
        where.brandId = brandId;
    if (companyId)
        where.companyId = companyId;
    if (genericId)
        where.genericId = genericId;
    if (isActive !== undefined)
        where.isActive = isActive;
    const validSortFields = [
        "createdAt",
        "updatedAt",
        "averageCostPrice",
        "averageRetailPrice",
        "safetyStock",
        "brandName",
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    let orderBy;
    if (sortField === "brandName") {
        orderBy = {
            brand: {
                name: sortOrder,
            },
        };
    }
    else {
        orderBy = { [sortField]: sortOrder };
    }
    // Step 1: Fetch all products with basic filters (excluding search)
    const allProducts = yield prisma.product.findMany({
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return (product.id.toString().includes(s) ||
                ((_b = (_a = product.generic) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(s)) ||
                ((_d = (_c = product.brand) === null || _c === void 0 ? void 0 : _c.name) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes(s)) ||
                ((_f = (_e = product.company) === null || _e === void 0 ? void 0 : _e.name) === null || _f === void 0 ? void 0 : _f.toLowerCase().includes(s)) ||
                ((_g = product.categories) === null || _g === void 0 ? void 0 : _g.some((category) => { var _a; return (_a = category.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(s); })) ||
                ((_h = product.averageCostPrice) === null || _h === void 0 ? void 0 : _h.toString().includes(s)) ||
                ((_j = product.averageRetailPrice) === null || _j === void 0 ? void 0 : _j.toString().includes(s)) ||
                ((_k = product.safetyStock) === null || _k === void 0 ? void 0 : _k.toString().includes(s)));
        });
    }
    // Step 3: Apply sorting
    if (sortField && validSortFields.includes(sortField)) {
        searched.sort((a, b) => {
            var _a, _b;
            if (sortField === "brandName") {
                const aName = ((_a = a.brand) === null || _a === void 0 ? void 0 : _a.name) || "";
                const bName = ((_b = b.brand) === null || _b === void 0 ? void 0 : _b.name) || "";
                return sortOrder === "asc"
                    ? aName.localeCompare(bName)
                    : bName.localeCompare(aName);
            }
            else {
                const aValue = a[sortField];
                const bValue = b[sortField];
                if (aValue === null || bValue === null)
                    return 0;
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
    const [totalCount, inventoryData] = yield Promise.all([
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
            totalCostValue: inventoryData.reduce((sum, item) => {
                var _a;
                return sum +
                    Number((_a = item.product.averageCostPrice) !== null && _a !== void 0 ? _a : 0) * item.initialQuantity;
            }, 0),
            totalRetailValue: inventoryData.reduce((sum, item) => {
                var _a;
                return sum +
                    Number((_a = item.product.averageRetailPrice) !== null && _a !== void 0 ? _a : 0) * item.initialQuantity;
            }, 0),
            currentCostValue: inventoryData.reduce((sum, item) => {
                var _a;
                return sum +
                    Number((_a = item.product.averageCostPrice) !== null && _a !== void 0 ? _a : 0) * item.currentQuantity;
            }, 0),
            currentRetailValue: inventoryData.reduce((sum, item) => {
                var _a;
                return sum +
                    Number((_a = item.product.averageRetailPrice) !== null && _a !== void 0 ? _a : 0) * item.currentQuantity;
            }, 0),
            totalMarkupValue: inventoryData.reduce((sum, item) => {
                var _a, _b;
                const cost = Number((_a = item.product.averageCostPrice) !== null && _a !== void 0 ? _a : 0);
                const retail = Number((_b = item.product.averageRetailPrice) !== null && _b !== void 0 ? _b : 0);
                return sum + (retail - cost) * item.initialQuantity;
            }, 0),
            currentMarkupValue: inventoryData.reduce((sum, item) => {
                var _a, _b;
                const cost = Number((_a = item.product.averageCostPrice) !== null && _a !== void 0 ? _a : 0);
                const retail = Number((_b = item.product.averageRetailPrice) !== null && _b !== void 0 ? _b : 0);
                return sum + (retail - cost) * item.currentQuantity;
            }, 0),
        },
        inventory: {
            totalStockItems: inventoryData.reduce((sum, item) => sum + item.currentQuantity, 0),
            averageStockPerProduct: inventoryData.length > 0
                ? inventoryData.reduce((sum, item) => sum + item.currentQuantity, 0) /
                    new Set(inventoryData.map((item) => item.productId)).size
                : 0,
            lowStockProducts: (() => {
                const productStocks = inventoryData.reduce((acc, item) => {
                    acc[item.productId] =
                        (acc[item.productId] || 0) + item.currentQuantity;
                    return acc;
                }, {});
                return Object.entries(productStocks).filter(([productId, totalStock]) => {
                    var _a;
                    const product = searched.find((p) => p.id === parseInt(productId));
                    const safetyStock = (_a = product === null || product === void 0 ? void 0 : product.safetyStock) !== null && _a !== void 0 ? _a : 10;
                    return totalStock < safetyStock;
                }).length;
            })(),
            outOfStockProducts: (() => {
                const productStocks = inventoryData.reduce((acc, item) => {
                    acc[item.productId] =
                        (acc[item.productId] || 0) + item.currentQuantity;
                    return acc;
                }, {});
                return Object.values(productStocks).filter((stock) => stock === 0)
                    .length;
            })(),
            productsWithInventory: new Set(inventoryData.map((item) => item.productId)).size,
        },
        categoryDistribution: searched.reduce((acc, p) => {
            var _a;
            if (p.categories && p.categories.length > 0) {
                p.categories.forEach((category) => {
                    var _a, _b;
                    const name = (_a = category.name) !== null && _a !== void 0 ? _a : "Uncategorized";
                    acc[name] = ((_b = acc[name]) !== null && _b !== void 0 ? _b : 0) + 1;
                });
            }
            else {
                acc["Uncategorized"] = ((_a = acc["Uncategorized"]) !== null && _a !== void 0 ? _a : 0) + 1;
            }
            return acc;
        }, {}),
        companyOptions: searched
            .reduce((acc, p) => {
            if (p.company) {
                const existing = acc.find((item) => item.id === p.company.id);
                if (existing) {
                    existing.count++;
                }
                else {
                    acc.push({
                        id: p.company.id,
                        name: p.company.name,
                        count: 1,
                    });
                }
            }
            return acc;
        }, [])
            .sort((a, b) => a.name.localeCompare(b.name)),
        categoryOptions: searched
            .reduce((acc, p) => {
            if (p.categories && p.categories.length > 0) {
                p.categories.forEach((category) => {
                    const existing = acc.find((item) => item.id === category.id);
                    if (existing) {
                        existing.count++;
                    }
                    else {
                        acc.push({
                            id: category.id,
                            name: category.name,
                            count: 1,
                        });
                    }
                });
            }
            return acc;
        }, [])
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
            newestProduct: searched.length > 0
                ? searched.reduce((newest, p) => new Date(p.createdAt) > new Date(newest.createdAt) ? p : newest).createdAt
                : null,
            lastUpdated: searched.length > 0
                ? searched.reduce((latest, p) => new Date(p.updatedAt) > new Date(latest.updatedAt) ? p : latest).updatedAt
                : null,
        },
        dataQuality: {
            productsWithoutGeneric: searched.filter((p) => !p.generic).length,
            productsWithoutBrand: searched.filter((p) => !p.brand).length,
            productsWithoutCategory: searched.filter((p) => !p.categories || p.categories.length === 0).length,
            productsWithoutCompany: searched.filter((p) => !p.company).length,
            productsWithoutPricing: searched.filter((p) => !p.averageCostPrice || !p.averageRetailPrice).length,
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
});
exports.products = products;
