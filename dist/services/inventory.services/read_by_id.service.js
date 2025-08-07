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
exports.inventory_by_id = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const inventory_by_id = (id_1, ...args_1) => __awaiter(void 0, [id_1, ...args_1], void 0, function* (id, page = 1, limit = 10, search = "", sortField = "createdAt", sortOrder = "desc") {
    if (!id || isNaN(id)) {
        throw new Error("Valid inventory ID is required");
    }
    if (page < 1)
        page = 1;
    if (limit < 1)
        limit = 10;
    // Validate sort field
    const validSortFields = [
        "initialQuantity",
        "currentQuantity",
        "costPrice",
        "retailPrice",
        "createdAt",
        "updatedAt",
    ];
    const validatedSortField = validSortFields.includes(sortField)
        ? sortField
        : "createdAt";
    const validatedSortOrder = sortOrder.toLowerCase() === "asc" || sortOrder.toLowerCase() === "desc"
        ? sortOrder.toLowerCase()
        : "desc";
    const skip = (page - 1) * limit;
    // First, get the inventory batch without items to check if it exists
    const inventoryBatch = yield prisma.inventoryBatch.findUnique({
        where: { id, isActive: true },
        include: {
            supplier: true,
            district: true,
            createdBy: { select: { id: true, fullname: true } },
            updatedBy: { select: { id: true, fullname: true } },
        },
    });
    if (!inventoryBatch) {
        throw new Error("Inventory batch not found");
    }
    // Build search conditions for items
    const searchConditions = search.trim()
        ? {
            OR: [
                // Search in product brand name
                {
                    product: {
                        brand: {
                            name: {
                                contains: search,
                            },
                        },
                    },
                },
                // Search in product generic name
                {
                    product: {
                        generic: {
                            name: {
                                contains: search,
                            },
                        },
                    },
                },
                // Search in product company name
                {
                    product: {
                        company: {
                            name: {
                                contains: search,
                            },
                        },
                    },
                },
                // Search in last update reason
                {
                    lastUpdateReason: {
                        contains: search,
                    },
                },
                // Search in product's last update reason
                {
                    product: {
                        lastUpdateReason: {
                            contains: search,
                        },
                    },
                },
            ],
        }
        : {};
    const whereCondition = Object.assign({ batchId: id }, searchConditions);
    // Get total count of items for this inventory batch (with search filter)
    const totalItems = yield prisma.inventoryItem.count({
        where: whereCondition,
    });
    // Get paginated items (with search filter and sorting)
    const items = yield prisma.inventoryItem.findMany({
        where: whereCondition,
        include: {
            product: { include: { brand: true, generic: true, company: true } },
            createdBy: { select: { id: true, fullname: true } },
            updatedBy: { select: { id: true, fullname: true } },
        },
        omit: { batchId: true },
        skip,
        take: limit,
        orderBy: { [validatedSortField]: validatedSortOrder },
    });
    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    const pagination_items_array = {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
    };
    // Combine inventory batch with paginated items
    const inventory = [
        Object.assign(Object.assign({}, inventoryBatch), { items }),
    ];
    return {
        inventory,
        pagination_items_array,
    };
});
exports.inventory_by_id = inventory_by_id;
