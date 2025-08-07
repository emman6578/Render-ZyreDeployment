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
exports.read_purchaseEditLists_service = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    omit: {
        purchaseEdit: {
            id: true,
        },
    },
});
const read_purchaseEditLists_service = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = "1", limit = "10", search = "", sortField = "editedAt", sortOrder = "desc", } = params;
    // Parse pagination parameters
    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNumber - 1) * pageSize;
    // Build search conditions - only for string fields
    const searchConditions = search
        ? {
            OR: [
                {
                    batchNumber: {
                        contains: search,
                    },
                },
                {
                    genericName: {
                        contains: search,
                    },
                },
                {
                    brandName: {
                        contains: search,
                    },
                },
                {
                    reason: {
                        contains: search,
                    },
                },
                {
                    description: {
                        contains: search,
                    },
                },
            ],
        }
        : {};
    // Define sortable fields
    const allowedSortFields = [
        "id",
        "editType",
        "purchaseId",
        "purchaseItemId",
        "batchNumber",
        "genericName",
        "brandName",
        "action",
        "reason",
        "editedById",
        "editedAt",
    ];
    const validSortField = allowedSortFields.includes(sortField)
        ? sortField
        : "editedAt";
    const validSortOrder = sortOrder === "asc" ? "asc" : "desc";
    const orderBy = {
        [validSortField]: validSortOrder,
    };
    try {
        const totalItems = yield prisma.purchaseEdit.count({
            where: searchConditions,
        });
        const edits = yield prisma.purchaseEdit.findMany({
            where: searchConditions,
            orderBy,
            skip,
            take: pageSize,
            include: {
                editedBy: {
                    select: {
                        fullname: true,
                    },
                },
            },
        });
        const totalPages = Math.ceil(totalItems / pageSize);
        const hasNextPage = pageNumber < totalPages;
        const hasPreviousPage = pageNumber > 1;
        return {
            data: edits,
            pagination: {
                currentPage: pageNumber,
                totalPages,
                totalItems,
                itemsPerPage: pageSize,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }
    catch (error) {
        throw new Error(`Failed to retrieve purchase edits: ${error.message}`);
    }
});
exports.read_purchaseEditLists_service = read_purchaseEditLists_service;
