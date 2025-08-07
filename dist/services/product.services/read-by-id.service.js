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
exports.readByid = exports.getProductTransactionHistory = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Helper function to calculate running balance for transactions
const calculateRunningBalance = (transactions) => {
    let runningBalance = 0;
    return transactions.map((transaction) => {
        // Calculate the quantity change for this transaction
        const quantityChange = (transaction.quantityIn || 0) - (transaction.quantityOut || 0);
        runningBalance += quantityChange;
        return Object.assign(Object.assign({}, transaction), { balance: runningBalance });
    });
};
// New function to get complete transaction history with balance
const getProductTransactionHistory = (productId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!productId || isNaN(productId)) {
        throw new Error("Valid product ID is required");
    }
    // Get all transactions for this product in chronological order
    const allTransactions = yield prisma.productTransaction.findMany({
        where: { productId: productId },
        include: {
            user: { select: { id: true, fullname: true } },
        },
        orderBy: { createdAt: "asc" }, // Chronological order for balance calculation
    });
    // Calculate running balance for all transactions
    const transactionsWithBalance = calculateRunningBalance(allTransactions);
    // Get current inventory balance from inventory items
    const currentInventoryBalance = yield prisma.inventoryItem.aggregate({
        where: {
            productId: productId,
            status: { not: "EXPIRED" }, // Exclude expired items
        },
        _sum: { currentQuantity: true },
    });
    // Calculate summary statistics
    const summary = {
        totalTransactions: allTransactions.length,
        beginningInventory: transactionsWithBalance.length > 0
            ? transactionsWithBalance[0].balance
            : 0,
        currentBalance: currentInventoryBalance._sum.currentQuantity || 0,
        calculatedBalance: transactionsWithBalance.length > 0
            ? transactionsWithBalance[transactionsWithBalance.length - 1].balance
            : 0,
        totalInbound: allTransactions.reduce((sum, t) => sum + (t.quantityIn || 0), 0),
        totalOutbound: allTransactions.reduce((sum, t) => sum + (t.quantityOut || 0), 0),
        balanceValidation: {
            calculatedBalance: transactionsWithBalance.length > 0
                ? transactionsWithBalance[transactionsWithBalance.length - 1].balance
                : 0,
            currentInventory: currentInventoryBalance._sum.currentQuantity || 0,
            isBalanced: Math.abs((transactionsWithBalance.length > 0
                ? transactionsWithBalance[transactionsWithBalance.length - 1]
                    .balance
                : 0) - (currentInventoryBalance._sum.currentQuantity || 0)) <= 0,
            difference: (transactionsWithBalance.length > 0
                ? transactionsWithBalance[transactionsWithBalance.length - 1].balance
                : 0) - (currentInventoryBalance._sum.currentQuantity || 0),
        },
    };
    return {
        transactions: transactionsWithBalance.reverse(), // Show newest first for display
        summary,
    };
});
exports.getProductTransactionHistory = getProductTransactionHistory;
const readByid = (productId_1, ...args_1) => __awaiter(void 0, [productId_1, ...args_1], void 0, function* (productId, page = 1, limit = 10, dateFrom, dateTo) {
    if (!productId || isNaN(productId)) {
        throw new Error("Valid product ID is required");
    }
    // Validate pagination parameters
    const pageNumber = Math.max(1, page);
    const limitNumber = Math.max(1, Math.min(100, limit)); // Max 100 items per page
    const skip = (pageNumber - 1) * limitNumber;
    // Get basic product information (without transactions first)
    const product = yield prisma.product.findUnique({
        where: { id: productId },
        include: {
            generic: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
            company: { select: { id: true, name: true } },
            categories: { select: { id: true, name: true } },
            createdBy: {
                select: {
                    id: true,
                    fullname: true,
                    email: true,
                    role: { select: { name: true } },
                },
            },
            updatedBy: {
                select: {
                    id: true,
                    fullname: true,
                    email: true,
                    role: { select: { name: true } },
                },
            },
        },
    });
    if (!product) {
        return null;
    }
    // Build date filter conditions
    const dateFilter = {};
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        dateFilter.gte = fromDate;
    }
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
    }
    // Get ALL transactions for this product to calculate balance properly
    const allTransactions = yield prisma.productTransaction.findMany({
        where: Object.assign({ productId: productId }, (Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })),
        include: {
            user: { select: { id: true, fullname: true } },
        },
        orderBy: { createdAt: "asc" }, // Chronological order for balance calculation
    });
    // Calculate running balance for all transactions
    const transactionsWithBalance = calculateRunningBalance(allTransactions);
    // Get beginning inventory (first transaction balance or 0)
    const beginningInventory = transactionsWithBalance.length > 0 ? transactionsWithBalance[0].balance : 0;
    // Get current inventory balance from inventory items
    const currentInventoryBalance = yield prisma.inventoryItem.aggregate({
        where: {
            productId: productId,
            status: { not: "EXPIRED" }, // Exclude expired items
        },
        _sum: { currentQuantity: true },
    });
    // Apply pagination to the transactions with balance
    const startIndex = skip;
    const endIndex = startIndex + limitNumber;
    const paginatedTransactions = transactionsWithBalance
        .reverse() // Show newest first for display
        .slice(startIndex, endIndex);
    // Calculate pagination metadata
    const totalTransactions = allTransactions.length;
    const totalPages = Math.ceil(totalTransactions / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;
    // Combine product data with paginated transactions
    const productWithPaginatedTransactions = Object.assign(Object.assign({}, product), { inventorySummary: {
            currentBalance: currentInventoryBalance._sum.currentQuantity || 0,
            beginningInventory: beginningInventory,
            totalTransactions: totalTransactions,
            // Add validation to check if calculated balance matches current inventory
            balanceValidation: {
                calculatedBalance: transactionsWithBalance.length > 0
                    ? transactionsWithBalance[transactionsWithBalance.length - 1]
                        .balance
                    : 0,
                currentInventory: currentInventoryBalance._sum.currentQuantity || 0,
                isBalanced: Math.abs((transactionsWithBalance.length > 0
                    ? transactionsWithBalance[transactionsWithBalance.length - 1]
                        .balance
                    : 0) - (currentInventoryBalance._sum.currentQuantity || 0)) <= 0,
            },
        }, transactions: {
            data: paginatedTransactions,
            pagination: {
                currentPage: pageNumber,
                totalPages: totalPages,
                totalItems: totalTransactions,
                itemsPerPage: limitNumber,
                hasNextPage: hasNextPage,
                hasPreviousPage: hasPreviousPage,
            },
        } });
    return productWithPaginatedTransactions;
});
exports.readByid = readByid;
