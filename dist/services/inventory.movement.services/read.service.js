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
exports.inventory_movement_list = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    omit: {
        inventoryMovement: {
            inventoryItemId: true,
            createdById: true,
        },
    },
});
const inventory_movement_list = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, limit = 10, search = "", sortField, sortOrder = "desc", movementType, dateFrom, dateTo) {
    const skip = (page - 1) * limit;
    // Step 1: Build base conditions for database query
    const baseConditions = {};
    // Add movement type filter
    if (movementType) {
        baseConditions.movementType = movementType;
    }
    // Add date range filter
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
    // Step 2: Fetch everything (with joins)
    const allMovements = yield prisma.inventoryMovement.findMany({
        where: baseConditions,
        include: {
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
    // Step 3: Apply search filter
    const searched = allMovements.filter((movement) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5;
        if (!search)
            return true;
        const s = search.toLowerCase();
        // Search by movement ID
        const searchAsNumber = parseInt(search);
        if (!isNaN(searchAsNumber) && movement.id === searchAsNumber) {
            return true;
        }
        // Search by reason
        if ((_a = movement.reason) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(s)) {
            return true;
        }
        // Search by movementType
        if ((_b = movement.movementType) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(s)) {
            return true;
        }
        // Search by reference ID
        if ((_c = movement.referenceId) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(s)) {
            return true;
        }
        // Search by created by fullname
        if ((_e = (_d = movement.createdBy) === null || _d === void 0 ? void 0 : _d.fullname) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes(s)) {
            return true;
        }
        // Search by generic name
        if ((_j = (_h = (_g = (_f = movement.inventoryItem) === null || _f === void 0 ? void 0 : _f.product) === null || _g === void 0 ? void 0 : _g.generic) === null || _h === void 0 ? void 0 : _h.name) === null || _j === void 0 ? void 0 : _j.toLowerCase().includes(s)) {
            return true;
        }
        // Search by brand name
        if ((_o = (_m = (_l = (_k = movement.inventoryItem) === null || _k === void 0 ? void 0 : _k.product) === null || _l === void 0 ? void 0 : _l.brand) === null || _m === void 0 ? void 0 : _m.name) === null || _o === void 0 ? void 0 : _o.toLowerCase().includes(s)) {
            return true;
        }
        // Search by batch number
        if ((_r = (_q = (_p = movement.inventoryItem) === null || _p === void 0 ? void 0 : _p.batch) === null || _q === void 0 ? void 0 : _q.batchNumber) === null || _r === void 0 ? void 0 : _r.toLowerCase().includes(s)) {
            return true;
        }
        // Search by supplier name
        if ((_v = (_u = (_t = (_s = movement.inventoryItem) === null || _s === void 0 ? void 0 : _s.batch) === null || _t === void 0 ? void 0 : _t.supplier) === null || _u === void 0 ? void 0 : _u.name) === null || _v === void 0 ? void 0 : _v.toLowerCase().includes(s)) {
            return true;
        }
        // Search by district name
        if ((_z = (_y = (_x = (_w = movement.inventoryItem) === null || _w === void 0 ? void 0 : _w.batch) === null || _x === void 0 ? void 0 : _x.district) === null || _y === void 0 ? void 0 : _y.name) === null || _z === void 0 ? void 0 : _z.toLowerCase().includes(s)) {
            return true;
        }
        // Search by invoice number
        if ((_2 = (_1 = (_0 = movement.inventoryItem) === null || _0 === void 0 ? void 0 : _0.batch) === null || _1 === void 0 ? void 0 : _1.invoiceNumber) === null || _2 === void 0 ? void 0 : _2.toLowerCase().includes(s)) {
            return true;
        }
        // Search by document type (dt)
        if ((_5 = (_4 = (_3 = movement.inventoryItem) === null || _3 === void 0 ? void 0 : _3.batch) === null || _4 === void 0 ? void 0 : _4.dt) === null || _5 === void 0 ? void 0 : _5.toLowerCase().includes(s)) {
            return true;
        }
        return false;
    });
    function calculateSummary(movements) {
        let stats = {
            totalQuantityMoved: 0,
            totalInbound: 0,
            totalOutbound: 0,
            totalAdjustments: 0,
            totalTransfers: 0,
            inboundCount: 0,
            outboundCount: 0,
            adjustmentCount: 0,
            transferCount: 0,
            otherCount: 0,
            oldestMovement: null,
            newestMovement: null,
        };
        movements.forEach((movement) => {
            var _a;
            const quantity = Math.abs(movement.quantity || 0);
            const movementType = (_a = movement.movementType) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            const createdAt = movement.createdAt;
            // Total quantity moved
            stats.totalQuantityMoved += quantity;
            // Categorize movement
            switch (movementType) {
                case "inbound":
                case "purchase":
                case "return":
                    stats.totalInbound += quantity;
                    stats.inboundCount++;
                    break;
                case "outbound":
                case "sale":
                case "dispensed":
                    stats.totalOutbound += quantity;
                    stats.outboundCount++;
                    break;
                case "adjustment":
                case "stock_adjustment":
                    stats.totalAdjustments += quantity;
                    stats.adjustmentCount++;
                    break;
                case "transfer":
                    stats.totalTransfers += quantity;
                    stats.transferCount++;
                    break;
                default:
                    stats.otherCount++;
            }
            // Track date range
            if (createdAt) {
                if (!stats.oldestMovement || createdAt < stats.oldestMovement) {
                    stats.oldestMovement = createdAt;
                }
                if (!stats.newestMovement || createdAt > stats.newestMovement) {
                    stats.newestMovement = createdAt;
                }
            }
        });
        return {
            // Original structure
            totalQuantityMoved: stats.totalQuantityMoved,
            totalInboundQuantity: stats.totalInbound,
            totalOutboundQuantity: stats.totalOutbound,
            totalAdjustmentQuantity: stats.totalAdjustments,
            totalTransferQuantity: stats.totalTransfers,
            inboundCount: stats.inboundCount,
            outboundCount: stats.outboundCount,
            adjustmentCount: stats.adjustmentCount,
            transferCount: stats.transferCount,
            oldestMovement: stats.oldestMovement,
            newestMovement: stats.newestMovement,
            // Calculated field (same as before)
            netMovement: stats.totalInbound - stats.totalOutbound,
            // Optional: Add new metrics without breaking existing consumers
            _meta: {
                otherCount: stats.otherCount, // Hidden from frontend unless requested
            },
        };
    }
    const fullSummary = calculateSummary(searched);
    // Step 4: Sort by specified field
    const allowedSortFields = [
        "id",
        "createdAt",
        "quantity",
        "previousQuantity",
        "newQuantity",
        "movementType",
        "approvalDate",
        "expiryDate",
        "invoiceDate",
    ];
    if (sortField && allowedSortFields.includes(sortField)) {
        searched.sort((a, b) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            let aValue;
            let bValue;
            // Handle nested sorting for related fields
            switch (sortField) {
                case "expiryDate":
                    aValue = (_b = (_a = a.inventoryItem) === null || _a === void 0 ? void 0 : _a.batch) === null || _b === void 0 ? void 0 : _b.expiryDate;
                    bValue = (_d = (_c = b.inventoryItem) === null || _c === void 0 ? void 0 : _c.batch) === null || _d === void 0 ? void 0 : _d.expiryDate;
                    break;
                case "invoiceDate":
                    aValue = (_f = (_e = a.inventoryItem) === null || _e === void 0 ? void 0 : _e.batch) === null || _f === void 0 ? void 0 : _f.invoiceDate;
                    bValue = (_h = (_g = b.inventoryItem) === null || _g === void 0 ? void 0 : _g.batch) === null || _h === void 0 ? void 0 : _h.invoiceDate;
                    break;
                default:
                    aValue = a[sortField];
                    bValue = b[sortField];
            }
            // Handle null/undefined values
            if (!aValue && !bValue)
                return 0;
            if (!aValue)
                return sortOrder === "asc" ? -1 : 1;
            if (!bValue)
                return sortOrder === "asc" ? 1 : -1;
            // Handle date fields
            if (sortField === "createdAt" ||
                sortField === "approvalDate" ||
                sortField === "expiryDate" ||
                sortField === "invoiceDate") {
                const aTime = new Date(aValue).getTime();
                const bTime = new Date(bValue).getTime();
                return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
            }
            // Handle numeric fields
            if (sortField === "id" ||
                sortField === "quantity" ||
                sortField === "previousQuantity" ||
                sortField === "newQuantity") {
                return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
            }
            // Handle string fields
            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();
            if (sortOrder === "asc") {
                return aStr.localeCompare(bStr);
            }
            else {
                return bStr.localeCompare(aStr);
            }
        });
    }
    // Step 5: Paginate
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
    return {
        movements: paginated,
        pagination,
        summary: fullSummary,
        filters: {
            search,
            sortField,
            sortOrder,
            movementType,
            dateFrom,
            dateTo,
        },
    };
});
exports.inventory_movement_list = inventory_movement_list;
