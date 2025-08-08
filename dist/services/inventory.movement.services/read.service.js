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
exports.inventory_movement_with_running_balance = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    omit: {
        inventoryMovement: {
            createdById: true,
        },
    },
});
// New function to calculate running balances
const inventory_movement_with_running_balance = (inventoryItemId_1, dateFrom_1, dateTo_1, ...args_1) => __awaiter(void 0, [inventoryItemId_1, dateFrom_1, dateTo_1, ...args_1], void 0, function* (inventoryItemId, dateFrom, dateTo, page = 1, limit = 10) {
    var _a, _b;
    // Build base conditions
    const baseConditions = {};
    if (inventoryItemId) {
        baseConditions.inventoryItemId = inventoryItemId;
    }
    if (dateFrom || dateTo) {
        baseConditions.createdAt = {};
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            baseConditions.createdAt.gte = fromDate;
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            baseConditions.createdAt.lte = toDate;
        }
    }
    // Fetch movements ordered chronologically (newest first)
    const movements = yield prisma.inventoryMovement.findMany({
        where: baseConditions,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
            id: true,
            quantity: true,
            movementType: true,
            reason: true,
            referenceId: true,
            approvalDate: true,
            createdAt: true,
            inventoryItemId: true,
            inventoryItem: {
                include: {
                    product: {
                        select: {
                            generic: { select: { name: true } },
                            brand: { select: { name: true } },
                            categories: { select: { name: true } },
                        },
                    },
                    batch: {
                        select: {
                            invoiceDate: true,
                            expiryDate: true,
                            batchNumber: true,
                            invoiceNumber: true,
                            dt: true,
                            supplier: { select: { name: true } },
                            district: { select: { name: true } },
                        },
                    },
                },
            },
            createdBy: { select: { fullname: true } },
        },
    });
    // Calculate running balance (we need to reverse the order for proper calculation)
    const movementsReversed = [...movements].reverse(); // Reverse for chronological calculation
    let runningBalance = 0;
    const movementsWithBalance = movementsReversed.map((movement) => {
        // Determine if this is an IN or OUT movement
        const isInbound = [
            "INBOUND",
            "RETURN",
            "TRANSFER", // Assuming transfers can be inbound
        ].includes(movement.movementType);
        const isOutbound = ["OUTBOUND", "EXPIRED"].includes(movement.movementType);
        // Calculate balance change
        let balanceChange = 0;
        if (isInbound) {
            balanceChange = Math.abs(movement.quantity);
        }
        else if (isOutbound) {
            balanceChange = -Math.abs(movement.quantity);
        }
        else if (movement.movementType === "ADJUSTMENT") {
            // For adjustments, use the actual quantity (can be positive or negative)
            balanceChange = movement.quantity;
        }
        // Update running balance
        runningBalance += balanceChange;
        return Object.assign(Object.assign({}, movement), { running_balance: runningBalance, balance_change: balanceChange, movement_direction: isInbound ? "IN" : isOutbound ? "OUT" : "ADJUSTMENT" });
    });
    // Reverse back to descending order for display
    const movementsWithBalanceDesc = movementsWithBalance.reverse();
    // Apply pagination
    const skip = (page - 1) * limit;
    const totalItems = movementsWithBalanceDesc.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginated = movementsWithBalanceDesc.slice(skip, skip + limit);
    const pagination = {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
    // Calculate summary statistics
    const summary = {
        totalMovements: totalItems,
        finalBalance: runningBalance,
        totalInbound: movementsWithBalanceDesc.reduce((sum, m) => m.movement_direction === "IN" ? sum + Math.abs(m.balance_change) : sum, 0),
        totalOutbound: movementsWithBalanceDesc.reduce((sum, m) => m.movement_direction === "OUT" ? sum + Math.abs(m.balance_change) : sum, 0),
        totalAdjustments: movementsWithBalanceDesc.reduce((sum, m) => m.movement_direction === "ADJUSTMENT" ? sum + m.balance_change : sum, 0),
        oldestMovement: ((_a = movementsWithBalanceDesc[movementsWithBalanceDesc.length - 1]) === null || _a === void 0 ? void 0 : _a.createdAt) || null,
        newestMovement: ((_b = movementsWithBalanceDesc[0]) === null || _b === void 0 ? void 0 : _b.createdAt) || null,
    };
    return {
        movements: paginated,
        pagination,
        summary,
        filters: {
            inventoryItemId,
            dateFrom,
            dateTo,
        },
    };
});
exports.inventory_movement_with_running_balance = inventory_movement_with_running_balance;
