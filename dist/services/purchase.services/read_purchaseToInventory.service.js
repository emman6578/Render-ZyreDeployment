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
exports.purchase_list_to_inventory = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    omit: {
        purchase: {
            referenceNumber: true,
            createdById: true,
            updatedById: true,
            isActive: true,
        },
        purchaseItems: {
            batchId: true,
            productId: true,
            createdById: true,
            updatedById: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            lastUpdateReason: true,
        },
    },
});
const purchase_list_to_inventory = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, limit = 10, search = "", sortField, sortOrder = "desc") {
    const skip = (page - 1) * limit;
    // Step 1: Get all existing inventory batches to compare against
    const existingInventoryBatches = yield prisma.inventoryBatch.findMany({
        select: {
            batchNumber: true,
            supplierId: true,
            // You might want to include other fields for comparison
            // depending on your business logic
        },
    });
    // Create a Set for faster lookup
    const existingBatchKeys = new Set(existingInventoryBatches.map((batch) => `${batch.supplierId}-${batch.batchNumber}`));
    // Step 2: Fetch all purchases (with joins)
    const allPurchases = yield prisma.purchase.findMany({
        where: {
            AND: [
                { verifiedBy: { not: null } },
                { verificationDate: { not: null } },
                { status: "ACTIVE" }, // ADDED: Only show ACTIVE purchases
            ],
        },
        include: {
            supplier: { select: { id: true, name: true } },
            district: { select: { id: true, name: true, code: true } },
            createdBy: { select: { id: true, fullname: true } },
            updatedBy: { select: { id: true, fullname: true } },
            items: {
                include: {
                    product: {
                        select: {
                            id: true,
                            generic: true,
                            brand: true,
                            categories: { select: { name: true } },
                        },
                    },
                },
            },
        },
    });
    // Step 3: Filter out purchases that already exist in inventory
    const unconvertedPurchases = allPurchases.filter((purchase) => {
        const purchaseKey = `${purchase.supplierId}-${purchase.batchNumber}`;
        return !existingBatchKeys.has(purchaseKey);
    });
    // Step 4: Apply search filter
    const searched = unconvertedPurchases.filter((purchase) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const s = search.toLowerCase();
        const isExpired = purchase.expiryDate && new Date(purchase.expiryDate) < new Date();
        // Exclude expired batches
        if (isExpired) {
            return false;
        }
        return (((_a = purchase.batchNumber) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(s)) ||
            ((_c = (_b = purchase.supplier) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(s)) ||
            ((_e = (_d = purchase.district) === null || _d === void 0 ? void 0 : _d.name) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes(s)) ||
            ((_g = (_f = purchase.district) === null || _f === void 0 ? void 0 : _f.code) === null || _g === void 0 ? void 0 : _g.toLowerCase().includes(s)) ||
            ((_h = purchase.dt) === null || _h === void 0 ? void 0 : _h.toLowerCase().includes(s)) ||
            ((_j = purchase.invoiceNumber) === null || _j === void 0 ? void 0 : _j.toLowerCase().includes(s)) ||
            ((_k = purchase.receivedBy) === null || _k === void 0 ? void 0 : _k.toLowerCase().includes(s)) ||
            ((_l = purchase.verifiedBy) === null || _l === void 0 ? void 0 : _l.toLowerCase().includes(s)));
    });
    // Step 5: Sort by a date field if specified
    const allowedSortFields = [
        "invoiceDate",
        "expiryDate",
        "manufacturingDate",
        "createdAt",
        "updatedAt",
        "verificationDate",
    ];
    if (sortField && allowedSortFields.includes(sortField)) {
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
    else {
        // Default sort by createdAt desc
        searched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    // Step 6: Paginate
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
    return { purchases: paginated, pagination };
});
exports.purchase_list_to_inventory = purchase_list_to_inventory;
