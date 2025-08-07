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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventory_price_change_history_summary = exports.inventory_price_change_history_read = void 0;
const client_1 = require("@prisma/client");
const SuccessHandler_1 = require("@utils/SuccessHandler/SuccessHandler");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const inventory_price_change_functions_1 = require("./inventory.price.change.functions/inventory.price.change.functions");
const prisma = new client_1.PrismaClient();
exports.inventory_price_change_history_read = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
    const search = ((_a = req.query.search) === null || _a === void 0 ? void 0 : _a.trim()) || "";
    // Build a where clause for full-text search on the InventoryItem→Product
    const whereClause = search
        ? {
            OR: [
                {
                    inventoryItem: {
                        product: { generic: { name: { contains: search } } },
                    },
                },
                {
                    inventoryItem: {
                        product: { brand: { name: { contains: search } } },
                    },
                },
                {
                    inventoryItem: {
                        batch: { batchNumber: { contains: search } },
                    },
                },
                {
                    inventoryItem: {
                        batch: { referenceNumber: { contains: search } },
                    },
                },
                {
                    inventoryItem: {
                        product: {
                            categories: {
                                some: { name: { contains: search } },
                            },
                        },
                    },
                },
            ],
        }
        : {};
    // Fetch matching history entries, newest first
    const allHistory = yield prisma.inventoryPriceChangeHistory.findMany({
        where: whereClause,
        orderBy: { effectiveDate: "desc" },
        include: {
            inventoryItem: {
                select: {
                    id: true,
                    batch: {
                        select: { id: true, batchNumber: true, referenceNumber: true },
                    },
                    product: {
                        select: {
                            id: true,
                            generic: { select: { name: true } },
                            brand: { select: { name: true } },
                            categories: { select: { name: true } },
                        },
                    },
                },
            },
            createdBy: { select: { id: true, fullname: true } },
        },
    });
    // Group by batch number
    const groupedByBatch = allHistory.reduce((acc, item) => {
        const batchNumber = item.inventoryItem.batch.batchNumber;
        const refNum = item.inventoryItem.batch.referenceNumber;
        if (!acc[batchNumber]) {
            acc[batchNumber] = [];
        }
        acc[batchNumber].push(item);
        return acc;
    }, {});
    // Transform grouped data to show only the latest entry per batch
    const transformedData = Object.entries(groupedByBatch).map(([batchNumber, historyItems]) => {
        var _a, _b, _c, _d, _e, _f;
        // Sort by effectiveDate desc to get the latest entry first
        const sortedItems = historyItems.sort((a, b) => new Date(b.effectiveDate).getTime() -
            new Date(a.effectiveDate).getTime());
        const latestItem = sortedItems[0];
        return {
            id: latestItem.id,
            inventoryItemId: latestItem.inventoryItem.id,
            batchId: latestItem.inventoryItem.batch.id,
            batchNumber: batchNumber,
            referenceNumber: latestItem.inventoryItem.batch.referenceNumber,
            // Product info
            productId: latestItem.inventoryItem.product.id,
            genericName: (_b = (_a = latestItem.inventoryItem.product.generic) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : null,
            brandName: (_d = (_c = latestItem.inventoryItem.product.brand) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : null,
            categories: (_f = (_e = latestItem.inventoryItem.product.categories) === null || _e === void 0 ? void 0 : _e.map((cat) => cat.name)) !== null && _f !== void 0 ? _f : [],
            // Price change info
            previousCostPrice: latestItem.previousCostPrice
                ? Number(latestItem.previousCostPrice)
                : 0,
            previousRetailPrice: latestItem.previousRetailPrice
                ? Number(latestItem.previousRetailPrice)
                : 0,
            latestCostPrice: Number(latestItem.averageCostPrice),
            latestRetailPrice: Number(latestItem.averageRetailPrice),
            effectiveDate: latestItem.effectiveDate,
            reason: latestItem.reason,
            createdById: latestItem.createdBy.id,
            createdBy: latestItem.createdBy.fullname,
        };
    });
    // Sort the transformed data by latest effective date (newest first)
    const sortedTransformedData = transformedData.sort((a, b) => new Date(b.effectiveDate).getTime() -
        new Date(a.effectiveDate).getTime());
    // Paginate the grouped results
    const totalItems = sortedTransformedData.length;
    const skip = (page - 1) * itemsPerPage;
    const paginatedData = sortedTransformedData.slice(skip, skip + itemsPerPage);
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationMeta = {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
    (0, SuccessHandler_1.successHandler)({
        pagination: paginationMeta,
        data: paginatedData,
    }, res, "GET", "Inventory Price Change Log (grouped by batch) fetched successfully");
}));
exports.inventory_price_change_history_summary = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const batchNumber = req.params.batchNumber;
    if (!batchNumber) {
        throw new Error("Valid batch number is required");
    }
    // First, find the batch using a non-unique query
    const batch = yield prisma.inventoryBatch.findFirst({
        where: { batchNumber },
        select: {
            id: true,
            batchNumber: true,
            referenceNumber: true,
            invoiceDate: true,
            expiryDate: true,
            supplier: { select: { name: true } },
            district: { select: { name: true } },
        },
    });
    if (!batch) {
        throw new Error("Batch not found");
    }
    // Get all price changes for items in this batch with full product details
    const priceChanges = yield prisma.inventoryPriceChangeHistory.findMany({
        where: {
            inventoryItem: {
                batchId: batch.id,
            },
        },
        orderBy: { effectiveDate: "desc" },
        include: {
            inventoryItem: {
                select: {
                    id: true,
                    costPrice: true,
                    retailPrice: true,
                    product: {
                        select: {
                            id: true,
                            averageCostPrice: true,
                            averageRetailPrice: true,
                            generic: { select: { name: true } },
                            brand: { select: { name: true } },
                            company: { select: { name: true } },
                        },
                    },
                    batch: { select: { batchNumber: true } },
                },
            },
            createdBy: { select: { fullname: true } },
        },
    });
    if (!priceChanges.length) {
        (0, SuccessHandler_1.successHandler)({
            batchInfo: {
                batchNumber: batch.batchNumber,
                referenceNumber: batch.referenceNumber,
                invoiceDate: batch.invoiceDate,
                expiryDate: batch.expiryDate,
                supplier: batch.supplier.name,
                district: batch.district.name,
                message: "No price changes recorded for this batch",
            },
        }, res, "GET", "Inventory price insights fetched successfully");
        return;
    }
    // Group price changes by product for better analysis
    const groupedByProduct = priceChanges.reduce((acc, change) => {
        const productId = change.inventoryItem.product.id;
        if (!acc[productId]) {
            acc[productId] = {
                product: change.inventoryItem.product,
                inventoryItem: change.inventoryItem,
                history: [],
            };
        }
        acc[productId].history.push(change);
        return acc;
    }, {});
    // Calculate analytics for each product
    const productAnalytics = Object.values(groupedByProduct).map((group) => {
        var _a, _b;
        const { product, inventoryItem, history } = group;
        // Calculate insights using the helper functions
        const insights = (0, inventory_price_change_functions_1.calculatePriceInsights)(history);
        const statistics = (0, inventory_price_change_functions_1.calculatePriceStatistics)(history, product);
        const trends = (0, inventory_price_change_functions_1.analyzePriceTrends)(history);
        // Find significant changes
        const biggestIncrease = (0, inventory_price_change_functions_1.findBiggestChange)(insights, "increase");
        const biggestDecrease = (0, inventory_price_change_functions_1.findBiggestChange)(insights, "decrease");
        const mostActiveMonth = (0, inventory_price_change_functions_1.findMostActiveMonth)(history);
        return {
            product: {
                id: product.id,
                generic: product.generic.name,
                brand: product.brand.name,
                company: product.company.name,
                categories: (_b = (_a = product.categories) === null || _a === void 0 ? void 0 : _a.map((cat) => cat.name)) !== null && _b !== void 0 ? _b : [],
            },
            inventoryItem: {
                id: inventoryItem.id,
                currentCostPrice: parseFloat(inventoryItem.costPrice.toString()),
                currentRetailPrice: parseFloat(inventoryItem.retailPrice.toString()),
            },
            priceChangeHistory: history.map((change, index) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
                return ({
                    id: change.id,
                    priceChange: {
                        costPrice: {
                            previous: change.previousCostPrice
                                ? parseFloat(change.previousCostPrice.toString())
                                : 0,
                            current: (_b = (_a = change.averageCostPrice) === null || _a === void 0 ? void 0 : _a.toNumber()) !== null && _b !== void 0 ? _b : 0,
                            change: ((_d = (_c = change.averageCostPrice) === null || _c === void 0 ? void 0 : _c.toNumber()) !== null && _d !== void 0 ? _d : 0) -
                                ((_f = (_e = change.previousCostPrice) === null || _e === void 0 ? void 0 : _e.toNumber()) !== null && _f !== void 0 ? _f : 0),
                            changePercentage: change.previousCostPrice &&
                                change.previousCostPrice.toNumber() !== 0
                                ? Math.round(((((_h = (_g = change.averageCostPrice) === null || _g === void 0 ? void 0 : _g.toNumber()) !== null && _h !== void 0 ? _h : 0) -
                                    ((_k = (_j = change.previousCostPrice) === null || _j === void 0 ? void 0 : _j.toNumber()) !== null && _k !== void 0 ? _k : 0)) /
                                    change.previousCostPrice.toNumber()) *
                                    100)
                                : 0,
                        },
                        retailPrice: {
                            previous: change.previousRetailPrice
                                ? change.previousRetailPrice.toNumber()
                                : 0,
                            current: (_m = (_l = change.averageRetailPrice) === null || _l === void 0 ? void 0 : _l.toNumber()) !== null && _m !== void 0 ? _m : 0,
                            change: ((_p = (_o = change.averageRetailPrice) === null || _o === void 0 ? void 0 : _o.toNumber()) !== null && _p !== void 0 ? _p : 0) -
                                ((_r = (_q = change.previousRetailPrice) === null || _q === void 0 ? void 0 : _q.toNumber()) !== null && _r !== void 0 ? _r : 0),
                            changePercentage: change.previousRetailPrice &&
                                change.previousRetailPrice.toNumber() !== 0
                                ? Math.round(((((_t = (_s = change.averageRetailPrice) === null || _s === void 0 ? void 0 : _s.toNumber()) !== null && _t !== void 0 ? _t : 0) -
                                    ((_v = (_u = change.previousRetailPrice) === null || _u === void 0 ? void 0 : _u.toNumber()) !== null && _v !== void 0 ? _v : 0)) /
                                    change.previousRetailPrice.toNumber()) *
                                    100)
                                : 0,
                        },
                    },
                    insights: insights[index], // Individual change insights
                    metadata: {
                        effectiveDate: change.effectiveDate,
                        reason: change.reason,
                        updatedBy: change.createdBy.fullname,
                    },
                });
            }),
            analytics: {
                statistics,
                trends,
                significantChanges: {
                    biggestIncrease,
                    biggestDecrease,
                    mostActiveMonth,
                },
                summary: {
                    totalChanges: history.length,
                    averageChangeInterval: (0, inventory_price_change_functions_1.calculateAverageChangeInterval)(history),
                    priceStabilityScore: (0, inventory_price_change_functions_1.calculatePriceStabilityScore)(statistics),
                    profitMarginHealth: (0, inventory_price_change_functions_1.assessProfitMarginHealth)(statistics.profitMargin.current),
                },
            },
            recommendations: (0, inventory_price_change_functions_1.generateRecommendations)(statistics, trends, {
                totalChanges: history.length,
            }),
        };
    });
    // Calculate batch-level analytics
    const batchSummary = {
        totalProducts: Object.keys(groupedByProduct).length,
        totalPriceChanges: priceChanges.length,
        averageChangesPerProduct: Math.round((priceChanges.length / Object.keys(groupedByProduct).length) * 100) / 100,
        dateRange: {
            firstChange: (_a = priceChanges[priceChanges.length - 1]) === null || _a === void 0 ? void 0 : _a.effectiveDate,
            lastChange: (_b = priceChanges[0]) === null || _b === void 0 ? void 0 : _b.effectiveDate,
        },
        batchHealthScore: (0, inventory_price_change_functions_1.calculateBatchHealthScore)(productAnalytics),
    };
    // Prepare final response
    const analysisData = {
        batchInfo: Object.assign({ batchNumber: batch.batchNumber, referenceNumber: batch.referenceNumber, invoiceDate: batch.invoiceDate, expiryDate: batch.expiryDate, supplier: batch.supplier.name, district: batch.district.name }, batchSummary),
        productAnalytics,
        batchRecommendations: (0, inventory_price_change_functions_1.generateBatchRecommendations)(batchSummary, productAnalytics),
        generatedAt: new Date().toISOString(),
    };
    (0, SuccessHandler_1.successHandler)(analysisData, res, "GET", "Comprehensive inventory price analysis completed successfully");
}));
