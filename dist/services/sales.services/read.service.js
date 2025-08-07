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
exports.getSalesData = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Define sortable fields to prevent SQL injection
const SORTABLE_FIELDS = [
    "id",
    "referenceNumber",
    "saleDate",
    "quantity",
    "unitRetailPrice",
    "unitFinalPrice",
    "amountPaid",
    "balance",
    "status",
    "createdAt",
    "updatedAt",
    "customerName",
    "classification",
    "genericName",
    "brandName",
    "companyName",
    "batchNumber",
    "expiryDate",
    "supplierName",
];
// Define searchable fields
const SEARCHABLE_FIELDS = [
    "transactionID",
    "customerName",
    "classification",
    "genericName",
    "brandName",
    "companyName",
    "batchNumber",
    "supplierName",
    "invoiceNumber",
    "documentType",
    "transactionGroup",
    "notes",
    "areaCode",
];
const calculateSalesSummary = (sales) => {
    const summary = sales.reduce((acc, sale) => {
        var _a, _b;
        // Calculate total revenue: unitFinalPrice is already the total price for this sale
        const revenue = sale.unitFinalPrice;
        // Calculate COGS: quantity * costPrice
        const cogs = ((_a = sale.inventoryItem) === null || _a === void 0 ? void 0 : _a.costPrice)
            ? sale.quantity * sale.inventoryItem.costPrice
            : 0;
        // Calculate returns impact
        const processedReturns = (sale.returns || []).filter((r) => r.status === "PROCESSED");
        const returnedQty = processedReturns.reduce((sum, r) => sum + (r.returnQuantity || 0), 0);
        const returnedRevenue = processedReturns.reduce((sum, r) => sum + (r.returnPrice || 0), 0);
        const returnedCOGS = ((_b = sale.inventoryItem) === null || _b === void 0 ? void 0 : _b.costPrice)
            ? returnedQty * sale.inventoryItem.costPrice
            : 0;
        // Net calculations after returns
        const netRevenue = revenue - returnedRevenue;
        const netCOGS = cogs - returnedCOGS;
        const netQuantity = sale.quantity - returnedQty;
        acc.totalRevenue += Number(netRevenue);
        acc.totalCOGS += Number(netCOGS);
        acc.totalQuantitySold += netQuantity;
        acc.totalAmountPaid += Number(sale.amountPaid) || 0;
        acc.totalBalance += Number(sale.balance) || 0;
        return acc;
    }, {
        totalRevenue: 0,
        totalCOGS: 0,
        totalQuantitySold: 0,
        totalAmountPaid: 0,
        totalBalance: 0,
    });
    const totalGrossProfit = summary.totalRevenue - summary.totalCOGS;
    const averageOrderValue = sales.length > 0 ? summary.totalRevenue / sales.length : 0;
    return Object.assign(Object.assign({}, summary), { totalGrossProfit,
        averageOrderValue });
};
const getSalesData = (queryParams) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = "1", limit = "10", search = "", sortField = "createdAt", sortOrder = "desc", status, paymentTerms, paymentMethod, districtId, psrId, customerId, dateFrom, dateTo, } = queryParams;
    // Validate and parse pagination parameters
    const currentPage = Math.max(1, parseInt(page) || 1);
    const itemsPerPage = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (currentPage - 1) * itemsPerPage;
    // Validate sort parameters
    const validSortField = SORTABLE_FIELDS.includes(sortField)
        ? sortField
        : "createdAt";
    const validSortOrder = sortOrder === "asc" ? "asc" : "desc";
    // Build where clause for filtering
    const whereClause = {
        isActive: true, // Only fetch active sales
    };
    // Add search functionality
    if (search && search.trim()) {
        const searchTerm = search.trim();
        whereClause.OR = SEARCHABLE_FIELDS.map((field) => ({
            [field]: {
                contains: searchTerm,
            },
        }));
    }
    // Add specific filters
    if (status) {
        whereClause.status = status;
    }
    if (paymentTerms) {
        whereClause.paymentTerms = paymentTerms;
    }
    if (paymentMethod) {
        whereClause.paymentMethod = paymentMethod;
    }
    if (districtId) {
        const districtIdNum = parseInt(districtId);
        if (!isNaN(districtIdNum)) {
            whereClause.districtId = districtIdNum;
        }
    }
    if (psrId) {
        const psrIdNum = parseInt(psrId);
        if (!isNaN(psrIdNum)) {
            whereClause.psrId = psrIdNum;
        }
    }
    if (customerId) {
        const customerIdNum = parseInt(customerId);
        if (!isNaN(customerIdNum)) {
            whereClause.customerId = customerIdNum;
        }
    }
    // Add date range filter
    if (dateFrom || dateTo) {
        whereClause.saleDate = {};
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            if (!isNaN(fromDate.getTime())) {
                whereClause.saleDate.gte = fromDate;
            }
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            if (!isNaN(toDate.getTime())) {
                // Set to end of day
                toDate.setHours(23, 59, 59, 999);
                whereClause.saleDate.lte = toDate;
            }
        }
    }
    // Build order by clause
    const orderBy = {};
    orderBy[validSortField] = validSortOrder;
    // Execute queries in parallel
    const [sales, totalCount, summaryData] = yield Promise.all([
        // Query 1: Get paginated sales data (existing)
        prisma.sales.findMany({
            where: whereClause,
            orderBy,
            skip,
            take: itemsPerPage,
            include: {
                inventoryItem: {
                    include: {
                        product: {
                            include: {
                                generic: true,
                                brand: true,
                                company: true,
                            },
                        },
                        batch: {
                            include: {
                                supplier: true,
                                district: true,
                            },
                        },
                    },
                },
                customer: {
                    select: {
                        id: true,
                        customerName: true,
                    },
                },
                psr: {
                    select: {
                        id: true,
                        psrCode: true,
                        fullName: true,
                        status: true,
                    },
                },
                district: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        fullname: true,
                        email: true,
                    },
                },
                updatedBy: {
                    select: {
                        id: true,
                        fullname: true,
                        email: true,
                    },
                },
                payments: {
                    select: {
                        id: true,
                        paymentMethod: true,
                        paymentAmount: true,
                        paymentDate: true,
                        status: true,
                        referenceNumber: true,
                    },
                },
                returns: {
                    select: {
                        id: true,
                        transactionID: true,
                        returnQuantity: true,
                        returnPrice: true,
                        returnReason: true,
                        returnDate: true,
                        status: true,
                    },
                },
            },
        }),
        // Query 2: Get total count (existing)
        prisma.sales.count({
            where: whereClause,
        }),
        yield prisma.sales.findMany({
            where: whereClause,
            select: {
                quantity: true,
                unitFinalPrice: true,
                amountPaid: true,
                balance: true,
                inventoryItem: {
                    select: {
                        costPrice: true,
                    },
                },
                returns: {
                    select: {
                        returnQuantity: true,
                        returnPrice: true,
                        status: true,
                    },
                },
            },
        }),
    ]);
    const summary = calculateSalesSummary(summaryData);
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;
    const pagination = {
        currentPage,
        totalPages,
        totalItems: totalCount,
        itemsPerPage,
        hasNextPage,
        hasPreviousPage,
    };
    // Add currentQuantity to each sale (quantity - sum of PROCESSED returns)
    const salesWithCurrentQuantity = sales.map((sale) => {
        const processedReturns = (sale.returns || []).filter((r) => r.status === "PROCESSED");
        const returnedQty = processedReturns.reduce((sum, r) => sum + (r.returnQuantity || 0), 0);
        return Object.assign(Object.assign({}, sale), { currentQuantity: sale.quantity - returnedQty });
    });
    const responseData = {
        sales: salesWithCurrentQuantity,
        pagination,
        summary,
        filters: {
            search,
            sortField: validSortField,
            sortOrder: validSortOrder,
            status,
            paymentTerms,
            paymentMethod,
            districtId,
            psrId,
            customerId,
            dateFrom,
            dateTo,
        },
    };
    return responseData;
});
exports.getSalesData = getSalesData;
