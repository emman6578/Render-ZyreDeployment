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
exports.product_price_change_history_read = exports.product_price_change_history_summary = void 0;
const client_1 = require("@prisma/client");
const SuccessHandler_1 = require("@utils/SuccessHandler/SuccessHandler");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const product_price_change_functions_1 = require("./product.price.change.functions/product.price.change.functions");
const prisma = new client_1.PrismaClient();
exports.product_price_change_history_summary = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const productId = parseInt(req.params.productId);
    if (!productId || isNaN(productId)) {
        throw new Error("Valid product ID is required");
    }
    // Get product details
    const product = yield prisma.product.findUnique({
        where: { id: productId, isActive: true },
        select: {
            id: true,
            generic: { select: { name: true } },
            brand: { select: { name: true } },
            company: { select: { name: true } },
            averageCostPrice: true,
            averageRetailPrice: true,
        },
    });
    if (!product) {
        throw new Error("Product not found");
    }
    // Get all price history for this product (latest to oldest)
    const priceHistory = yield prisma.productPriceHistory.findMany({
        where: { productId },
        orderBy: { effectiveDate: "desc" },
        include: {
            createdBy: { select: { fullname: true } },
        },
    });
    if (priceHistory.length === 0) {
        return (0, SuccessHandler_1.successHandler)({
            product: {
                id: product.id,
                name: `${product.generic.name} - ${product.brand.name}`,
                company: product.company.name,
                currentCostPrice: parseFloat(product.averageCostPrice.toString()),
                currentRetailPrice: parseFloat(product.averageRetailPrice.toString()),
            },
            summary: {
                totalChanges: 0,
                message: "No price change history found for this product",
            },
        }, res, "GET", "Product price insights fetched successfully");
    }
    // Calculate detailed insights
    const insights = (0, product_price_change_functions_1.calculatePriceInsights)(priceHistory);
    const statistics = (0, product_price_change_functions_1.calculatePriceStatistics)(priceHistory, product);
    const trends = (0, product_price_change_functions_1.analyzePriceTrends)(priceHistory);
    // Format history with insights
    const formattedHistory = priceHistory.map((item, index) => {
        const insight = insights[index];
        return {
            id: item.id,
            effectiveDate: item.effectiveDate,
            previousCostPrice: item.previousCostPrice
                ? parseFloat(item.previousCostPrice.toString())
                : null,
            previousRetailPrice: item.previousRetailPrice
                ? parseFloat(item.previousRetailPrice.toString())
                : null,
            averageCostPrice: parseFloat(item.averageCostPrice.toString()),
            averageRetailPrice: parseFloat(item.averageRetailPrice.toString()),
            profitMargin: (0, product_price_change_functions_1.calculateProfitMargin)(parseFloat(item.averageCostPrice.toString()), parseFloat(item.averageRetailPrice.toString())),
            reason: item.reason,
            createdBy: item.createdBy.fullname,
            insight: insight || null,
        };
    });
    // Summary statistics
    const summary = {
        totalChanges: priceHistory.length,
        firstChangeDate: (_a = priceHistory[priceHistory.length - 1]) === null || _a === void 0 ? void 0 : _a.effectiveDate,
        lastChangeDate: (_b = priceHistory[0]) === null || _b === void 0 ? void 0 : _b.effectiveDate,
        averageChangeInterval: (0, product_price_change_functions_1.calculateAverageChangeInterval)(priceHistory),
        priceIncreases: insights.filter((i) => (i === null || i === void 0 ? void 0 : i.changeType) === "increase")
            .length,
        priceDecreases: insights.filter((i) => (i === null || i === void 0 ? void 0 : i.changeType) === "decrease")
            .length,
        noChanges: insights.filter((i) => (i === null || i === void 0 ? void 0 : i.changeType) === "no_change").length,
        biggestIncrease: (0, product_price_change_functions_1.findBiggestChange)(insights, "increase"),
        biggestDecrease: (0, product_price_change_functions_1.findBiggestChange)(insights, "decrease"),
        mostActiveMonth: (0, product_price_change_functions_1.findMostActiveMonth)(priceHistory),
        changeFrequency: (0, product_price_change_functions_1.calculateChangeFrequency)(priceHistory),
    };
    const response = {
        product: {
            id: product.id,
            name: `${product.generic.name} - ${product.brand.name}`,
            company: product.company.name,
            currentCostPrice: parseFloat(product.averageCostPrice.toString()),
            currentRetailPrice: parseFloat(product.averageRetailPrice.toString()),
            currentProfitMargin: (0, product_price_change_functions_1.calculateProfitMargin)(parseFloat(product.averageCostPrice.toString()), parseFloat(product.averageRetailPrice.toString())),
        },
        summary,
        statistics,
        trends,
        history: formattedHistory,
        recommendations: (0, product_price_change_functions_1.generateRecommendations)(statistics, trends, summary),
    };
    (0, SuccessHandler_1.successHandler)(response, res, "GET", "Product price insights fetched successfully");
}));
exports.product_price_change_history_read = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
    const search = ((_a = req.query.search) === null || _a === void 0 ? void 0 : _a.trim()) || "";
    // Build a where clause that only contains the full-text search
    const whereClause = search
        ? {
            OR: [
                { product: { generic: { name: { contains: search } } } },
                { product: { brand: { name: { contains: search } } } },
            ],
        }
        : {};
    // Get all matching history records sorted by effectiveDate desc
    const allHistory = yield prisma.productPriceHistory.findMany({
        orderBy: { effectiveDate: "desc" },
        where: whereClause,
        include: {
            product: {
                select: {
                    generic: { select: { name: true } },
                    brand: { select: { name: true } },
                },
            },
            createdBy: { select: { fullname: true } },
        },
    });
    // Group by product (generic + brand combination) and keep only the latest entry
    const productMap = new Map();
    allHistory.forEach((item) => {
        var _a, _b, _c, _d, _e, _f;
        const genericName = (_c = (_b = (_a = item.product) === null || _a === void 0 ? void 0 : _a.generic) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : null;
        const brandName = (_f = (_e = (_d = item.product) === null || _d === void 0 ? void 0 : _d.brand) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : null;
        const productKey = `${genericName}-${brandName}`;
        // Only keep the first occurrence (latest due to desc ordering)
        if (!productMap.has(productKey)) {
            productMap.set(productKey, {
                id: item.id,
                productId: item.productId,
                genericName,
                brandName,
                previousCostPrice: item.previousCostPrice
                    ? parseFloat(item.previousCostPrice.toString())
                    : 0,
                previousRetailPrice: item.previousRetailPrice
                    ? parseFloat(item.previousRetailPrice.toString())
                    : 0,
                averageCostPrice: parseFloat(item.averageCostPrice.toString()),
                averageRetailPrice: parseFloat(item.averageRetailPrice.toString()),
                effectiveDate: item.effectiveDate,
                reason: item.reason,
                createdById: item.createdById,
                createdBy: item.createdBy.fullname,
            });
        }
    });
    // Convert map to array
    const uniqueProducts = Array.from(productMap.values());
    // Apply pagination to the grouped results
    const totalItems = uniqueProducts.length;
    const skip = (page - 1) * itemsPerPage;
    const paginatedHistory = uniqueProducts.slice(skip, skip + itemsPerPage);
    // Pagination metadata
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
        data: paginatedHistory,
    }, res, "GET", "Product Price Change Log fetched successfully");
}));
