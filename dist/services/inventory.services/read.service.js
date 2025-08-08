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
exports.inventory_list = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const inventory_list = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, limit = 10, search = "", sortField, sortOrder = "desc", status, // NEW: Filter for batch status
dateFrom, dateTo) {
    const skip = (page - 1) * limit;
    // Helper function to build status filter conditions
    const buildStatusFilter = (statusParam) => {
        if (!statusParam || statusParam.toLowerCase() === "all") {
            return undefined; // No filter - return all statuses
        }
        // Check if it's a valid InventoryStatus enum value
        const validStatuses = Object.values(client_1.InventoryStatus);
        const upperStatus = statusParam.toUpperCase();
        if (validStatuses.includes(upperStatus)) {
            return upperStatus;
        }
        return undefined; // Invalid status, no filter
    };
    // Build filter conditions
    const batchStatusFilter = buildStatusFilter(status);
    // const itemStatusFilter = buildStatusFilter(itemStatus);
    // Build the where clause for batch filtering
    const batchWhereClause = {
        isActive: true,
    };
    // Add batch status filter if provided
    if (batchStatusFilter) {
        batchWhereClause.status = batchStatusFilter;
    }
    // Add date range filter if provided
    if (dateFrom || dateTo) {
        batchWhereClause.createdAt = {};
        if (dateFrom) {
            // Set to start of the day (00:00:00)
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            batchWhereClause.createdAt.gte = fromDate;
        }
        if (dateTo) {
            // Set to end of the day (23:59:59.999)
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            batchWhereClause.createdAt.lte = toDate;
        }
    }
    // Step 1: Fetch everything (with joins and filters)
    const allInventories = yield prisma.inventoryBatch.findMany({
        where: batchWhereClause,
        include: {
            supplier: { select: { name: true } },
            district: { select: { name: true, code: true } },
            createdBy: { select: { fullname: true } },
            updatedBy: { select: { fullname: true } },
            items: {
                // Filter items by status if specified
                // where: itemStatusFilter ? { status: itemStatusFilter } : undefined,
                select: {
                    id: true,
                    initialQuantity: true,
                    currentQuantity: true,
                    costPrice: true,
                    retailPrice: true,
                    status: true,
                    product: {
                        select: {
                            generic: { select: { name: true } },
                            brand: { select: { name: true } },
                            image: true,
                            safetyStock: true,
                            categories: { select: { name: true } },
                        },
                    },
                },
            },
        },
    });
    // Step 2: Apply search filter
    const searched = allInventories.filter((inv) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const s = search.toLowerCase();
        // Check if any item's product matches the search
        const productMatches = inv.items.some((item) => {
            var _a, _b, _c, _d;
            return ((_b = (_a = item.product.generic) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(s)) ||
                ((_d = (_c = item.product.brand) === null || _c === void 0 ? void 0 : _c.name) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes(s));
        });
        return (((_a = inv.batchNumber) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(s)) ||
            ((_c = (_b = inv.supplier) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(s)) ||
            ((_e = (_d = inv.district) === null || _d === void 0 ? void 0 : _d.name) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes(s)) ||
            ((_g = (_f = inv.district) === null || _f === void 0 ? void 0 : _f.code) === null || _g === void 0 ? void 0 : _g.toLowerCase().includes(s)) ||
            ((_h = inv.dt) === null || _h === void 0 ? void 0 : _h.toLowerCase().includes(s)) ||
            ((_j = inv.invoiceNumber) === null || _j === void 0 ? void 0 : _j.toLowerCase().includes(s)) ||
            ((_k = inv.receivedBy) === null || _k === void 0 ? void 0 : _k.toLowerCase().includes(s)) ||
            ((_l = inv.verifiedBy) === null || _l === void 0 ? void 0 : _l.toLowerCase().includes(s)) ||
            productMatches ||
            ((_m = inv.referenceNumber) === null || _m === void 0 ? void 0 : _m.toLowerCase().includes(s)));
    });
    // Step 3: Sort by a date field if specified
    const allowedSortFields = [
        "invoiceDate",
        "expiryDate",
        "manufacturingDate",
        "createdAt",
        "updatedAt",
        "verificationDate",
        "currentQuantity",
    ];
    if (sortField && allowedSortFields.includes(sortField)) {
        searched.sort((a, b) => {
            if (sortField === "currentQuantity") {
                // Sum up current quantity for each inventory batch
                const aTotalQty = a.items.reduce((sum, item) => { var _a; return sum + ((_a = item.currentQuantity) !== null && _a !== void 0 ? _a : 0); }, 0);
                const bTotalQty = b.items.reduce((sum, item) => { var _a; return sum + ((_a = item.currentQuantity) !== null && _a !== void 0 ? _a : 0); }, 0);
                return sortOrder === "asc"
                    ? aTotalQty - bTotalQty
                    : bTotalQty - aTotalQty;
            }
            else {
                // Existing date field sorting logic
                const aDate = a[sortField];
                const bDate = b[sortField];
                if (!aDate || !bDate)
                    return 0;
                return sortOrder === "asc"
                    ? new Date(aDate).getTime() - new Date(bDate).getTime()
                    : new Date(bDate).getTime() - new Date(aDate).getTime();
            }
        });
    }
    // Step 4: Paginate
    const totalItems = searched.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginated = searched.slice(skip, skip + limit);
    const pagination = {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
    // Step 5: Calculate summary for all ACTIVE records, regardless of current filter
    let totalCurrentQuantity = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let totalConsumedQuantity = 0;
    let totalOriginalQuantity = 0;
    let totalOriginalCostValue = 0;
    let totalOriginalRetailValue = 0;
    // Fetch all ACTIVE inventory batches for summary
    const allActiveInventories = yield prisma.inventoryBatch.findMany({
        where: { status: "ACTIVE", isActive: true },
        include: {
            items: true,
        },
    });
    for (const inv of allActiveInventories) {
        inv.items.forEach((it) => {
            var _a, _b, _c, _d;
            const initQty = (_a = it.initialQuantity) !== null && _a !== void 0 ? _a : 0;
            const currQty = (_b = it.currentQuantity) !== null && _b !== void 0 ? _b : 0;
            const costP = (_c = it.costPrice) !== null && _c !== void 0 ? _c : 0;
            const retailP = (_d = it.retailPrice) !== null && _d !== void 0 ? _d : 0;
            const consumed = initQty - currQty;
            // Raw totals
            totalCurrentQuantity += currQty;
            totalCostValue += Number(currQty) * Number(costP);
            totalRetailValue += currQty * Number(retailP);
            // Original totals
            totalOriginalQuantity += initQty;
            totalOriginalCostValue += Number(initQty) * Number(costP);
            totalOriginalRetailValue += initQty * Number(retailP);
            // Additional metrics
            totalConsumedQuantity += consumed;
        });
    }
    const summary = {
        totalCurrentQuantity,
        totalCostValue,
        totalRetailValue,
        totalConsumedQuantity,
        totalOriginalQuantity,
        totalOriginalCostValue,
        totalOriginalRetailValue,
    };
    return { inventories: paginated, pagination, summary };
});
exports.inventory_list = inventory_list;
