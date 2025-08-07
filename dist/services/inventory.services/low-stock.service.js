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
exports.low_stock_products_list = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const low_stock_products_list = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, limit = 10, search = "", sortField = "currentQuantity", sortOrder = "asc", dateFrom, // Add date from filter parameter
dateTo // Add date to filter parameter
) {
    const now = new Date();
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    // Parse date filters if provided
    const parsedDateFrom = dateFrom ? new Date(dateFrom) : null;
    const parsedDateTo = dateTo ? new Date(dateTo) : null;
    // Validate date filters
    if (parsedDateFrom && parsedDateTo && parsedDateFrom > parsedDateTo) {
        throw new Error("Date from cannot be greater than date to");
    }
    // Step 1: Fetch all batches with related data
    const allBatches = yield prisma.inventoryBatch.findMany({
        select: {
            id: true,
            batchNumber: true,
            referenceNumber: true,
            invoiceNumber: true,
            dt: true, // Include document type field
            invoiceDate: true,
            manufacturingDate: true,
            expiryDate: true,
            supplier: { select: { name: true } },
            district: { select: { name: true } },
            items: {
                include: {
                    product: {
                        select: {
                            id: true,
                            generic: { select: { name: true } },
                            brand: { select: { name: true } },
                            company: { select: { name: true } },
                            safetyStock: true,
                            categories: { select: { name: true } },
                        },
                    },
                },
            },
        },
    });
    // Step 2: Filter and transform data to get low stock items
    const lowStockBatches = allBatches
        .map((batch) => {
        // Filter items that are low stock and not expired
        const validItems = batch.items.filter((item) => {
            const isLowStock = item.currentQuantity <= item.product.safetyStock;
            const isNotExpired = batch.expiryDate && new Date(batch.expiryDate) > now;
            return isLowStock && isNotExpired;
        });
        // Skip batches with no valid items
        if (validItems.length === 0)
            return null;
        return {
            id: batch.id, // Add this line
            batchNumber: batch.batchNumber,
            referenceNumber: batch.referenceNumber,
            invoiceNumber: batch.invoiceNumber,
            dt: batch.dt, // Add this line
            invoiceDate: batch.invoiceDate,
            manufacturingDate: batch.manufacturingDate,
            expiryDate: batch.expiryDate,
            supplier: batch.supplier.name,
            district: batch.district.name,
            items: validItems.map((item) => ({
                productId: item.product.id,
                generic: item.product.generic.name,
                brand: item.product.brand.name,
                company: item.product.company.name,
                currentQuantity: item.currentQuantity,
                safetyStock: item.product.safetyStock,
                costPrice: item.costPrice,
                retailPrice: item.retailPrice,
                categories: item.product.categories.map((cat) => cat.name), // Add this line
            })),
        };
    })
        .filter((batch) => batch !== null);
    // Step 3: Apply search filter
    const searchedBatches = lowStockBatches.filter((batch) => {
        var _a, _b, _c, _d, _e;
        if (!search)
            return true;
        const s = search.toLowerCase();
        // Search in batch fields
        const batchMatch = (_a = batch.batchNumber) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(s);
        const refNumMatch = (_b = batch.referenceNumber) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(s);
        const dtMatch = (_c = batch.dt) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(s); // Add document type search
        const supplierMatch = (_d = batch.supplier) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes(s);
        const districtMatch = (_e = batch.district) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes(s);
        // Search in item fields
        const itemMatch = batch.items.some((item) => [item.generic, item.brand, item.company, ...item.categories].some((field // Modified this line
        ) => field === null || field === void 0 ? void 0 : field.toLowerCase().includes(s)));
        return (batchMatch ||
            supplierMatch ||
            districtMatch ||
            itemMatch ||
            refNumMatch ||
            dtMatch);
    });
    // Step 3.5: Apply date filters using only invoice date
    const dateFilteredBatches = searchedBatches.filter((batch) => {
        // If no date filters provided, include all batches
        if (!parsedDateFrom && !parsedDateTo)
            return true;
        const batchInvoiceDate = batch.invoiceDate
            ? new Date(batch.invoiceDate)
            : null;
        // Check if invoice date falls within the filter range
        const checkDateInRange = (date) => {
            if (!date)
                return false;
            const isAfterFrom = !parsedDateFrom || date >= parsedDateFrom;
            const isBeforeTo = !parsedDateTo || date <= parsedDateTo;
            return isAfterFrom && isBeforeTo;
        };
        // Include batch if invoice date falls within the filter range
        return checkDateInRange(batchInvoiceDate);
    });
    // Step 4: Flatten items for proper sorting and pagination
    const flattenedItems = dateFilteredBatches.flatMap((batch) => batch.items.map((item) => {
        var _a, _b, _c, _d, _e, _f;
        return (Object.assign(Object.assign({}, item), { costPrice: typeof item.costPrice === "object" && "toNumber" in item.costPrice
                ? item.costPrice.toNumber()
                : Number(item.costPrice), retailPrice: typeof item.retailPrice === "object" && "toNumber" in item.retailPrice
                ? item.retailPrice.toNumber()
                : Number(item.retailPrice), batchId: batch.id, batchNumber: (_a = batch.batchNumber) !== null && _a !== void 0 ? _a : "", referenceNumber: (_b = batch.referenceNumber) !== null && _b !== void 0 ? _b : "", invoiceNumber: (_c = batch.invoiceNumber) !== null && _c !== void 0 ? _c : "", dt: batch.dt, invoiceDate: batch.invoiceDate, manufacturingDate: (_d = batch.manufacturingDate) !== null && _d !== void 0 ? _d : new Date(0), expiryDate: batch.expiryDate, supplier: (_e = batch.supplier) !== null && _e !== void 0 ? _e : "", district: (_f = batch.district) !== null && _f !== void 0 ? _f : "", categories: item.categories || [] }));
    }));
    // Step 5: Sort the flattened items
    const allowedSortFields = [
        "currentQuantity",
        "safetyStock",
        "costPrice",
        "retailPrice",
        "generic",
        "brand",
        "company",
        "supplier",
        "district",
        "batchId", // Add batch ID to sortable fields
        "batchNumber",
        "dt", // Add document type to sortable fields
        "invoiceDate",
        "manufacturingDate",
        "expiryDate",
    ];
    if (sortField && allowedSortFields.includes(sortField)) {
        flattenedItems.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];
            // Handle date fields
            if (sortField.includes("Date")) {
                const aTime = new Date(aVal).getTime();
                const bTime = new Date(bVal).getTime();
                return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
            }
            // Handle price fields (convert to number)
            if (sortField === "costPrice" || sortField === "retailPrice") {
                const aNum = parseFloat(aVal) || 0;
                const bNum = parseFloat(bVal) || 0;
                return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
            }
            // Handle numeric fields
            if (sortField === "currentQuantity" ||
                sortField === "safetyStock" ||
                sortField === "productId") {
                const aNum = Number(aVal) || 0;
                const bNum = Number(bVal) || 0;
                return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
            }
            // Handle string fields
            if (typeof aVal === "string" && typeof bVal === "string") {
                return sortOrder === "asc"
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            return 0;
        });
    }
    // Step 6: Apply pagination to sorted items
    const totalItems = flattenedItems.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedItems = flattenedItems.slice(startIndex, endIndex);
    // Step 7: Group paginated items back into batches
    const paginatedBatches = paginatedItems.reduce((acc, item) => {
        const existingBatch = acc.find((batch) => batch.batchNumber === item.batchNumber);
        const itemData = {
            productId: item.productId,
            generic: item.generic,
            brand: item.brand,
            company: item.company,
            currentQuantity: item.currentQuantity,
            safetyStock: item.safetyStock,
            costPrice: item.costPrice,
            retailPrice: item.retailPrice,
            categories: item.categories, // Add this line
        };
        if (existingBatch) {
            existingBatch.items.push(itemData);
        }
        else {
            acc.push({
                id: item.batchId, // Add this line
                batchNumber: item.batchNumber,
                referenceNumber: item.referenceNumber,
                invoiceNumber: item.invoiceNumber,
                dt: item.dt, // Add this line
                invoiceDate: item.invoiceDate,
                manufacturingDate: item.manufacturingDate,
                expiryDate: item.expiryDate,
                supplier: item.supplier,
                district: item.district,
                items: [itemData],
            });
        }
        return acc;
    }, []);
    // Step 8: Build pagination info
    const pagination = {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: endIndex < totalItems,
        hasPreviousPage: startIndex > 0,
    };
    // Step 9: Build summary analytics
    let totalLowStockItems = 0;
    let totalCurrentStock = 0;
    let totalRequiredStock = 0;
    let totalStockDeficit = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let totalPotentialLoss = 0;
    // Analyze all flattened items (not just paginated ones) for accurate totals
    for (const item of flattenedItems) {
        totalLowStockItems++;
        totalCurrentStock += item.currentQuantity;
        totalRequiredStock += item.safetyStock;
        totalStockDeficit += Math.max(0, item.safetyStock - item.currentQuantity);
        totalCostValue += item.currentQuantity * item.costPrice;
        totalRetailValue += item.currentQuantity * item.retailPrice;
        // Potential loss if we can't meet demand due to low stock
        const shortfall = Math.max(0, item.safetyStock - item.currentQuantity);
        totalPotentialLoss += shortfall * item.retailPrice;
    }
    const summary = {
        totalLowStockItems,
        totalCurrentStock,
        totalRequiredStock,
        totalStockDeficit,
        totalCostValue,
        totalRetailValue,
        totalPotentialLoss,
        // Additional metrics
        averageStockLevel: totalLowStockItems > 0 ? totalCurrentStock / totalLowStockItems : 0,
        stockFulfillmentRate: totalRequiredStock > 0
            ? (totalCurrentStock / totalRequiredStock) * 100
            : 0,
        criticalItemsCount: flattenedItems.filter((item) => item.currentQuantity === 0).length,
        nearlyOutOfStockCount: flattenedItems.filter((item) => item.currentQuantity > 0 &&
            item.currentQuantity <= item.safetyStock * 0.5).length,
    };
    return {
        data: paginatedBatches,
        pagination,
        summary,
        filters: {
            search,
            sortField,
            sortOrder,
            dateFrom,
            dateTo,
        },
    };
});
exports.low_stock_products_list = low_stock_products_list;
