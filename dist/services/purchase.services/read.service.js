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
exports.purchase_list = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    omit: {
        purchase: {
            createdById: true,
            updatedById: true,
            isActive: true,
        },
        supplier: {
            id: true,
            contact: true,
            address: true,
            isActive: true,
        },
        district: {
            id: true,
            code: true,
            isActive: true,
        },
    },
});
const purchase_list = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, limit = 10, search = "", sortField, sortOrder = "desc", status = "ALL", dateFrom, dateTo) {
    const skip = (page - 1) * limit;
    const isVerificationStatus = status === "VERIFIED" || status === "UNVERIFIED";
    const isAllStatus = status === "ALL" || status === ""; // New: check for "ALL" status
    // Build the where clause conditionally
    let whereClause = {};
    // Date filtering
    if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            whereClause.createdAt.gte = fromDate;
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            whereClause.createdAt.lte = toDate;
        }
    }
    if (!isAllStatus) {
        // Only apply status filtering if not "ALL"
        if (isVerificationStatus) {
            // For verification status, we filter by verifiedBy/verificationDate presence
            const statusFilter = status === "VERIFIED"
                ? {
                    AND: [
                        { verifiedBy: { not: null } },
                        { verificationDate: { not: null } },
                    ],
                }
                : {
                    OR: [{ verifiedBy: null }, { verificationDate: null }],
                };
            // Combine date filter with status filter
            if (dateFrom || dateTo) {
                whereClause = {
                    AND: [whereClause, statusFilter],
                };
            }
            else {
                whereClause = statusFilter;
            }
        }
        else {
            // For regular status, filter by PurchaseStatus enum
            const statusFilter = { status: status };
            // Combine date filter with status filter
            if (dateFrom || dateTo) {
                whereClause = {
                    AND: [whereClause, statusFilter],
                };
            }
            else {
                whereClause = statusFilter;
            }
        }
    }
    // If isAllStatus is true and no date filters, whereClause remains empty object {}
    // Step 1: Fetch everything (with joins)
    const allInventories = yield prisma.purchase.findMany({
        where: whereClause,
        include: {
            supplier: true,
            district: true,
            createdBy: { select: { fullname: true } },
            updatedBy: { select: { fullname: true } },
            items: {
                select: {
                    id: true,
                    initialQuantity: true,
                    currentQuantity: true,
                    costPrice: true,
                    retailPrice: true,
                    product: {
                        select: {
                            generic: { select: { name: true } },
                            brand: { select: { name: true } },
                            image: true,
                            categories: { select: { name: true } },
                        },
                    },
                },
            },
        },
    });
    // Rest of the function remains the same...
    // Step 2: Apply search filter
    const searched = allInventories.filter((inv) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const s = search.toLowerCase();
        return (((_a = inv.batchNumber) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(s)) ||
            ((_c = (_b = inv.supplier) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(s)) ||
            ((_e = (_d = inv.district) === null || _d === void 0 ? void 0 : _d.name) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes(s)) ||
            ((_g = (_f = inv.district) === null || _f === void 0 ? void 0 : _f.code) === null || _g === void 0 ? void 0 : _g.toLowerCase().includes(s)) ||
            ((_h = inv.dt) === null || _h === void 0 ? void 0 : _h.toLowerCase().includes(s)) ||
            ((_j = inv.invoiceNumber) === null || _j === void 0 ? void 0 : _j.toLowerCase().includes(s)) ||
            ((_k = inv.receivedBy) === null || _k === void 0 ? void 0 : _k.toLowerCase().includes(s)) ||
            ((_l = inv.verifiedBy) === null || _l === void 0 ? void 0 : _l.toLowerCase().includes(s)) ||
            ((_m = inv.referenceNumber) === null || _m === void 0 ? void 0 : _m.toLocaleLowerCase().includes(s)));
    });
    // Step 3: Sort by a date field if specified
    const allowedSortFields = [
        "invoiceDate",
        "expiryDate",
        "manufacturingDate",
        "createdAt",
        "updatedAt",
        "verificationDate",
        "unverified",
    ];
    if (sortField && allowedSortFields.includes(sortField)) {
        if (sortField === "unverified") {
            // Special handling for unverified sort
            const unverified = searched.filter((inv) => !inv.verifiedBy && !inv.verificationDate);
            unverified.sort((a, b) => {
                const aTime = new Date(a.createdAt).getTime();
                const bTime = new Date(b.createdAt).getTime();
                return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
            });
            searched.length = 0;
            searched.push(...unverified);
        }
        else {
            // Regular date field sorting
            searched.sort((a, b) => {
                const aDate = a[sortField];
                const bDate = b[sortField];
                if (!aDate || !bDate)
                    return 0;
                return sortOrder === "asc"
                    ? new Date(aDate).getTime() - new Date(bDate).getTime()
                    : new Date(bDate).getTime() - new Date(aDate).getTime();
            });
        }
    }
    else {
        // Default sort by createdAt desc
        searched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    let totalInitialQuantity = 0;
    let totalCurrentQuantity = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let totalOrigCostValue = 0;
    let totalOrigRetailValue = 0;
    // Fetch all ACTIVE records for summary
    const allActiveInventories = yield prisma.purchase.findMany({
        where: { status: "ACTIVE" },
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
            totalInitialQuantity += initQty;
            totalCurrentQuantity += currQty;
            totalCostValue += Number(currQty) * Number(costP);
            totalRetailValue += currQty * Number(retailP);
            totalOrigCostValue += initQty * Number(costP);
            totalOrigRetailValue += initQty * Number(retailP);
        });
    }
    const summary = {
        totalInitialQuantity,
        totalCurrentQuantity,
        totalCostValue,
        totalRetailValue,
        totalOrigCostValue,
        totalOrigRetailValue,
    };
    return { purchases: paginated, pagination, summary };
});
exports.purchase_list = purchase_list;
