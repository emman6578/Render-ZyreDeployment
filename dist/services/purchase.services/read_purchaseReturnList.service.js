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
exports.read_purchaseReturnList_service = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const read_purchaseReturnList_service = (queryParams) => __awaiter(void 0, void 0, void 0, function* () {
    const { sortField, sortOrder, page = "1", limit = "10", search, status, dateFrom, dateTo, } = queryParams;
    // Parse pagination values
    const currentPage = Math.max(parseInt(page, 10), 1);
    const itemsPerPage = Math.max(parseInt(limit, 10), 1);
    const skip = (currentPage - 1) * itemsPerPage;
    // Define allowed sort fields and order
    const allowedSortFields = ["returnDate", "returnQuantity", "returnPrice"];
    let orderBy = undefined;
    if (sortField && allowedSortFields.includes(sortField)) {
        orderBy = {
            [sortField]: sortOrder === "desc" ? "desc" : "asc",
        };
    }
    else if (sortField === "expiryDate") {
        // Handle nested field sorting
        orderBy = {
            originalPurchase: { expiryDate: sortOrder === "desc" ? "desc" : "asc" },
        };
    }
    // Add default sorting
    if (!orderBy) {
        orderBy = { createdAt: "desc" };
    }
    // Build where clause for search
    let where = {};
    if (status) {
        where.status = status;
    }
    // Add date filtering
    if (dateFrom || dateTo) {
        where.returnDate = {};
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            where.returnDate.gte = fromDate;
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            where.returnDate.lte = toDate;
        }
    }
    if (search) {
        const searchTerm = String(search);
        where = Object.assign(Object.assign({}, where), { OR: [
                // Direct field search - convert to string for ID search
                { id: isNaN(Number(searchTerm)) ? undefined : Number(searchTerm) },
                // Nested originalPurchase fields
                {
                    originalPurchase: {
                        OR: [
                            { dt: { contains: searchTerm } },
                            {
                                invoiceNumber: { contains: searchTerm },
                            },
                            { batchNumber: { contains: searchTerm } },
                            {
                                supplier: {
                                    name: { contains: searchTerm },
                                },
                            },
                        ],
                    },
                },
                // Nested originalPurchaseItem.product fields
                {
                    originalPurchaseItem: {
                        product: {
                            OR: [
                                {
                                    generic: {
                                        name: { contains: searchTerm },
                                    },
                                },
                                {
                                    brand: {
                                        name: { contains: searchTerm },
                                    },
                                },
                                {
                                    categories: {
                                        some: {
                                            name: { contains: searchTerm },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
                // Return-specific fields
                { returnReason: { contains: searchTerm } },
                { notes: { contains: searchTerm } },
                { referenceNumber: { contains: searchTerm } },
            ].filter((condition) => {
                // Remove undefined conditions (like when ID search fails)
                return Object.values(condition).some((value) => value !== undefined);
            }) });
    }
    if (status) {
        where.status = status;
    }
    // Get total count for pagination
    const totalItems = yield prisma.purchaseReturn.count({ where });
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    // Fetch paginated data
    const returns = yield prisma.purchaseReturn.findMany({
        where,
        skip,
        take: itemsPerPage,
        orderBy,
        include: {
            originalPurchase: {
                include: {
                    supplier: true,
                    district: true,
                },
            },
            originalPurchaseItem: {
                include: {
                    product: {
                        include: {
                            generic: true,
                            brand: true,
                            categories: true,
                            company: true,
                        },
                    },
                },
            },
            processedBy: {
                select: {
                    id: true,
                    fullname: true,
                    email: true,
                },
            },
            approvedBy: {
                select: {
                    id: true,
                    fullname: true,
                    email: true,
                },
            },
        },
    });
    // Map to structured output
    const formattedReturns = returns.map((r) => ({
        id: r.id,
        dt: r.originalPurchase.dt,
        invoiceNumber: r.originalPurchase.invoiceNumber,
        batchNumber: r.originalPurchase.batchNumber,
        category: r.originalPurchaseItem.product.categories
            .map((c) => c.name)
            .join(", "),
        brand: r.originalPurchaseItem.product.brand.name,
        generic: r.originalPurchaseItem.product.generic.name,
        company: r.originalPurchaseItem.product.company.name,
        supplier: r.originalPurchase.supplier.name,
        district: r.originalPurchase.district.name,
        returnDate: r.returnDate,
        expiryDate: r.originalPurchase.expiryDate,
        returnQuantity: r.returnQuantity,
        returnPrice: r.returnPrice,
        returnReason: r.returnReason,
        returnNotes: r.notes,
        status: r.status,
        refNum: r.referenceNumber,
    }));
    // Format pagination metadata
    const pagination = {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
    };
    return {
        data: formattedReturns,
        pagination,
    };
});
exports.read_purchaseReturnList_service = read_purchaseReturnList_service;
