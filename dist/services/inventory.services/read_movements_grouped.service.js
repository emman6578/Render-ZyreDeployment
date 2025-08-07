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
exports.getInventoryMovementsGroupedByBatch = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getInventoryMovementsGroupedByBatch = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        // Build where clause for filtering
        const whereClause = {};
        // Handle combined batch and reference filtering
        if (filters.batchAndReference) {
            whereClause.AND = [
                {
                    inventoryItem: {
                        batch: {
                            batchNumber: filters.batchAndReference,
                        },
                    },
                },
                {
                    referenceId: filters.batchAndReference,
                },
            ];
        }
        else {
            // Handle separate filtering
            if (filters.batchNumber) {
                whereClause.inventoryItem = {
                    batch: {
                        batchNumber: filters.batchNumber,
                    },
                };
            }
            if (filters.referenceNumber) {
                whereClause.referenceId = filters.referenceNumber;
            }
        }
        // Add movement type filtering
        if (filters.movementType) {
            whereClause.movementType = filters.movementType;
        }
        // Add date range filtering
        if (filters.dateFrom || filters.dateTo) {
            const dateFilter = {};
            if (filters.dateFrom) {
                // Set to start of the day (00:00:00)
                const fromDate = new Date(filters.dateFrom);
                fromDate.setHours(0, 0, 0, 0);
                dateFilter.gte = fromDate;
            }
            if (filters.dateTo) {
                // Set to end of the day (23:59:59.999)
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59, 999);
                dateFilter.lte = toDate;
            }
            if (Object.keys(dateFilter).length > 0) {
                whereClause.createdAt = dateFilter;
            }
        }
        // Set default pagination values
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        // Get total count for pagination
        const totalCount = yield prisma.inventoryMovement.count({
            where: whereClause,
        });
        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;
        // Fetch all inventory movements with related data
        const movements = yield prisma.inventoryMovement.findMany({
            where: whereClause,
            include: {
                inventoryItem: {
                    include: {
                        batch: {
                            select: {
                                referenceNumber: true,
                                batchNumber: true,
                            },
                        },
                        product: {
                            include: {
                                generic: {
                                    select: {
                                        name: true,
                                    },
                                },
                                brand: {
                                    select: {
                                        name: true,
                                    },
                                },
                                categories: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        fullname: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                {
                    inventoryItem: {
                        batch: {
                            referenceNumber: "asc",
                        },
                    },
                },
                {
                    createdAt: "desc",
                },
            ],
            skip,
            take: limit,
        });
        // Group movements by batch reference number
        const groupedMovements = new Map();
        movements.forEach((movement) => {
            const referenceNumber = movement.inventoryItem.batch.referenceNumber;
            if (!groupedMovements.has(referenceNumber)) {
                groupedMovements.set(referenceNumber, []);
            }
            groupedMovements.get(referenceNumber).push(movement);
        });
        // Process each batch group to calculate balances and structure data
        const structuredData = [];
        const batchSummary = [];
        for (const [referenceNumber, batchMovements] of groupedMovements) {
            let remainingInventory = 0;
            const movementTypeCounts = {
                INBOUND: 0,
                OUTBOUND: 0,
                ADJUSTMENT: 0,
                TRANSFER: 0,
                RETURN: 0,
                EXPIRED: 0,
            };
            const dates = [];
            const products = new Map();
            // Get current inventory data for this batch
            const currentInventoryItems = yield prisma.inventoryItem.findMany({
                where: {
                    batch: {
                        referenceNumber: referenceNumber,
                    },
                },
                include: {
                    product: {
                        include: {
                            generic: {
                                select: {
                                    name: true,
                                },
                            },
                            brand: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });
            //  // Find the first INBOUND movement (chronologically last in sortedMovements)
            //  const beginningInventory = sortedMovements
            //  .filter((movement) => movement.movementType === "INBOUND")
            //  .reduce((sum, movement) => sum + (movement.quantity || 0), 0);
            // Calculate beginning inventory from current inventory items' initialQuantity
            const beginningInventory = currentInventoryItems.reduce((sum, item) => sum + (item.initialQuantity || 0), 0);
            // Sort movements by creation date to ensure chronological order (oldest first for balance calculation)
            const sortedMovements = batchMovements.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            // Calculate running balance chronologically
            let runningBalance = 0;
            const movementsWithBalance = sortedMovements.map((movement) => {
                runningBalance += movement.quantity;
                // Validate for negative balance (might indicate data issues)
                if (runningBalance < 0) {
                    console.warn(`Warning: Negative balance detected for movement ${movement.id}. Balance: ${runningBalance}, Movement: ${movement.movementType}, Quantity: ${movement.quantity}`);
                }
                return Object.assign(Object.assign({}, movement), { calculatedBalance: runningBalance });
            });
            // Validate final balance matches current inventory
            const finalCalculatedBalance = ((_a = movementsWithBalance[movementsWithBalance.length - 1]) === null || _a === void 0 ? void 0 : _a.calculatedBalance) || 0;
            const currentInventoryBalance = currentInventoryItems.reduce((sum, item) => sum + item.currentQuantity, 0);
            if (Math.abs(finalCalculatedBalance - currentInventoryBalance) > 0) {
                console.warn(`Warning: Balance mismatch detected. Calculated: ${finalCalculatedBalance}, Current Inventory: ${currentInventoryBalance}`);
            }
            // Reverse back to newest first for display
            const displayMovements = movementsWithBalance.reverse();
            for (const movement of displayMovements) {
                // Calculate remaining inventory (running balance)
                remainingInventory = movement.calculatedBalance;
                // Count movement types
                if (movement.movementType in movementTypeCounts) {
                    movementTypeCounts[movement.movementType]++;
                }
                // Track dates
                dates.push(movement.createdAt);
                // Track products
                const productKey = `${movement.inventoryItem.product.generic.name}-${movement.inventoryItem.product.brand.name}`;
                if (!products.has(productKey)) {
                    // Find current inventory data for this product
                    const currentInventoryItem = currentInventoryItems.find((item) => item.product.generic.name ===
                        movement.inventoryItem.product.generic.name &&
                        item.product.brand.name ===
                            movement.inventoryItem.product.brand.name);
                    products.set(productKey, {
                        generic: movement.inventoryItem.product.generic.name,
                        brand: movement.inventoryItem.product.brand.name,
                        remainingQuantity: 0,
                        movementCount: 0,
                        initialQuantity: (currentInventoryItem === null || currentInventoryItem === void 0 ? void 0 : currentInventoryItem.initialQuantity) || 0,
                        currentQuantity: (currentInventoryItem === null || currentInventoryItem === void 0 ? void 0 : currentInventoryItem.currentQuantity) || 0,
                        costPrice: (currentInventoryItem === null || currentInventoryItem === void 0 ? void 0 : currentInventoryItem.costPrice.toNumber()) || 0,
                        retailPrice: (currentInventoryItem === null || currentInventoryItem === void 0 ? void 0 : currentInventoryItem.retailPrice.toNumber()) || 0,
                        status: (currentInventoryItem === null || currentInventoryItem === void 0 ? void 0 : currentInventoryItem.status) || "UNKNOWN",
                    });
                }
                const product = products.get(productKey);
                product.remainingQuantity = movement.calculatedBalance; // Use calculated balance
                product.movementCount++;
                // Get categories as comma-separated string
                const categories = movement.inventoryItem.product.categories
                    .map((cat) => cat.name)
                    .join(", ");
                // Determine if this is a current quantity change or initial quantity change
                const isCurrentQuantityChange = ((_b = movement.reason) === null || _b === void 0 ? void 0 : _b.includes("Stock adjustment")) ||
                    ((_c = movement.reason) === null || _c === void 0 ? void 0 : _c.includes("quantity increased")) ||
                    ((_d = movement.reason) === null || _d === void 0 ? void 0 : _d.includes("quantity decreased"));
                const isInitialQuantityChange = ((_e = movement.reason) === null || _e === void 0 ? void 0 : _e.includes("Initial quantity correction")) ||
                    ((_f = movement.reason) === null || _f === void 0 ? void 0 : _f.includes("historical record"));
                // Structure the data according to requirements
                const structuredMovement = {
                    referenceNumber: movement.referenceId,
                    type: movement.movementType,
                    categories: categories,
                    generic: movement.inventoryItem.product.generic.name,
                    brand: movement.inventoryItem.product.brand.name,
                    batchNumber: movement.inventoryItem.batch.batchNumber,
                    quantity: movement.quantity,
                    previousQuantity: movement.previousQuantity,
                    newQuantity: movement.newQuantity,
                    balance: movement.calculatedBalance, // Use the properly calculated balance
                    reason: movement.reason,
                    createdBy: movement.createdBy.fullname,
                    dateCreated: movement.createdAt,
                    // Additional fields for better identification
                    isCurrentQuantityChange: isCurrentQuantityChange,
                    isInitialQuantityChange: isInitialQuantityChange,
                    movementId: movement.id,
                    inventoryItemId: movement.inventoryItemId,
                    productId: movement.inventoryItem.productId,
                };
                structuredData.push(structuredMovement);
            }
            // Calculate total remaining inventory from current inventory data
            const totalRemainingInventory = currentInventoryItems.reduce((sum, item) => sum + item.currentQuantity, 0);
            // Create batch summary
            const batchSummaryItem = {
                totalMovements: batchMovements.length,
                movementTypeCounts,
                remainingInventory: totalRemainingInventory, // Use actual current inventory
                uniqueProducts: products.size,
                dateRange: {
                    earliest: new Date(Math.min(...dates.map((d) => d.getTime()))),
                    latest: new Date(Math.max(...dates.map((d) => d.getTime()))),
                },
                products: Array.from(products.values()),
                beginningInventory, // Add the beginning inventory value
                balance: beginningInventory
                    ? totalRemainingInventory - beginningInventory
                    : totalRemainingInventory, // Calculate balance
            };
            batchSummary.push(batchSummaryItem);
        }
        return {
            message: "Inventory Movement grouped by batch",
            data: structuredData,
            totalMovements: structuredData.length,
            totalBatches: groupedMovements.size,
            batchSummary: batchSummary,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalCount,
                itemsPerPage: limit,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to get inventory movements grouped by batch: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while fetching inventory movements");
    }
    finally {
        yield prisma.$disconnect();
    }
});
exports.getInventoryMovementsGroupedByBatch = getInventoryMovementsGroupedByBatch;
