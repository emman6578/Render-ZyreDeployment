import { AuthRequest } from "@middlewares/authMiddleware";
import { ActionType, Prisma, PrismaClient } from "@prisma/client";
import { inventory_movement_list } from "@services/inventory.movement.services/read.service";
import { inventory_create } from "@services/inventory.services/create.service";
import { expired_products_list } from "@services/inventory.services/expired-products.service";
import { low_stock_products_list } from "@services/inventory.services/low-stock.service";
import { inventory_list } from "@services/inventory.services/read.service";
import { inventory_by_id } from "@services/inventory.services/read_by_id.service";
import {
  inventory_update,
  UpdateInventoryBatchRequest,
} from "@services/inventory.services/update.service";
import { getInventoryMovementsGroupedByBatch } from "@services/inventory.services/read_movements_grouped.service";
import { checkAndUpdateExpiredBatches } from "@utils/ExpiredChecker/expiredProducts";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { InventoryMovementQuery } from "src/types/inventory.types";
import { parseISO, isValid, formatDate } from "date-fns";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

// CREATE Inventory
export const create = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const batches = await inventory_create(req.body, req.user!.id);

    if (req.user?.id) {
      for (const batch of batches) {
        await prisma.activityLog.create({
          data: {
            userId: req.user.id,
            model: "InventoryBatch",
            recordId: batch.id,
            action: ActionType.CREATE,
            description: `Created inventory batch #${batch.batchNumber} (ID ${batch.id})`,
            ipAddress: req.ip,
            userAgent: (req.headers["user-agent"] as string) || null,
          },
        });
      }
    }

    successHandler(
      null,
      res,
      "POST",
      `Successfully created ${batches.length} inventory batch(es) with their items`
    );
  }
);
// READ Inventorys (with pagination, filtering)
export const read = expressAsyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string)?.toLowerCase() || "";

  // New filter inputs
  const sortField = req.query.sortField as string; // e.g., "invoice date"
  const sortOrder =
    (req.query.sortOrder as string)?.toLowerCase() === "asc" ? "asc" : "desc"; // default to desc

  const status = req.query.status as string;

  // Date filter inputs
  const dateFrom = req.query.dateFrom as string;
  const dateTo = req.query.dateTo as string;

  // NEW: Check and update expired batches before fetching
  await checkAndUpdateExpiredBatches();

  const { inventories, pagination, summary } = await inventory_list(
    page,
    limit,
    search,
    sortField,
    sortOrder,
    status,
    dateFrom,
    dateTo
  );

  successHandler(
    { inventories, pagination, summary },
    res,
    "GET",
    "Inventorys fetched successfully"
  );
});
// READ Single Inventory by ID
export const readById = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id: idParam } = req.params;

    const {
      page = "1",
      limit = "10",
      search = "",
      sortField = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const searchQuery = search as string;
    const sortFieldParam = sortField as string;
    const sortOrderParam = sortOrder as string;

    const result = await inventory_by_id(
      parseInt(idParam),
      pageNumber,
      limitNumber,
      searchQuery,
      sortFieldParam,
      sortOrderParam
    );

    successHandler(result, res, "GET", "Inventory fetched successfully");
  }
);
//Getting Info for Inventorys to be updated
export const readInventoryToUpdate = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id: idParam } = req.params;

    successHandler(
      "Read Inventory to update by id",
      res,
      "GET",
      "Inventory fetched successfully"
    );
  }
);
// UPDATE Inventory
export const update = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const batchId = parseInt(id);
    const userId = req.user?.id;

    if (!batchId || isNaN(batchId)) {
      throw new Error("Invalid batch ID provided");
    }

    if (!userId) {
      throw new Error("User authentication required");
    }

    const updateData: UpdateInventoryBatchRequest = {
      ...req.body,
      updatedById: userId,
    };

    // Proceed with update if validation passes
    const result = await inventory_update(
      batchId,
      updateData,
      userId.toString()
    );

    successHandler(
      result,
      res,
      "UPDATE",
      "Inventory batch updated successfully"
    );
  }
);
// DELETE Inventory (Soft delete - set isActive to false)
//TODO: Add Activity log
export const remove = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    successHandler(
      "soft delete inventory",
      res,
      "DELETE",
      "Inventory deactivated successfully"
    );
  }
);
// RESTORE Inventory (Reactivate soft-deleted Inventory)
//TODO: Add Activity log
export const restore = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    successHandler(
      "restore inventory",
      res,
      "PUT",
      "Inventory restored successfully"
    );
  }
);
//=====================================END OF CRUD==================================================================================================================================================================
export const expiredProducts = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User not found");
    }

    // Parse pagination & search params
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const itemsPerPage = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const search = (req.query.search as string)?.trim() || "";

    // Parse date filter parameters
    const dateFrom = (req.query.dateFrom as string) || undefined;
    const dateTo = (req.query.dateTo as string) || undefined;

    // Validate date parameters if provided
    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      throw new Error(
        "Invalid dateFrom format. Please use ISO date format (YYYY-MM-DD)"
      );
    }
    if (dateTo && isNaN(Date.parse(dateTo))) {
      throw new Error(
        "Invalid dateTo format. Please use ISO date format (YYYY-MM-DD)"
      );
    }

    // Call service function
    const result = await expired_products_list({
      page,
      itemsPerPage,
      search,
      userId,
      dateFrom,
      dateTo,
    });

    // Send back response
    successHandler(
      result,
      res,
      "GET",
      "Inventory expired products fetched successfully with loss analysis"
    );
  }
);
export const lowStockProducts = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    try {
      // Extract and parse query parameters
      const search = ((req.query.search as string) || "").toLowerCase();
      const sortField = (req.query.sortField as string) || "currentQuantity";
      const sortOrder =
        (req.query.sortOrder as string) === "desc" ? "desc" : "asc";
      const page = parseInt((req.query.page as string) || "1", 10);
      const limit = parseInt((req.query.limit as string) || "10", 10);

      // Extract date filter parameters
      const dateFrom = (req.query.dateFrom as string) || undefined;
      const dateTo = (req.query.dateTo as string) || undefined;

      // Validate date parameters if provided
      if (dateFrom && isNaN(Date.parse(dateFrom))) {
        throw new Error(
          "Invalid dateFrom format. Please use ISO date format (YYYY-MM-DD)"
        );
      }
      if (dateTo && isNaN(Date.parse(dateTo))) {
        throw new Error(
          "Invalid dateTo format. Please use ISO date format (YYYY-MM-DD)"
        );
      }

      // Call service function with date filters
      const responseData = await low_stock_products_list(
        page,
        limit,
        search,
        sortField,
        sortOrder,
        dateFrom,
        dateTo
      );

      // Send successful response
      successHandler(
        responseData,
        res,
        "GET",
        "Inventory low-stock (non-expired) products fetched successfully"
      );
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }
);
//===================================================================================================================================================================================================
//INVENTORY MOVEMENT CONTROLLER
export const inventoryMovementREAD = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Extract and parse query parameters
      const {
        search = "",
        sortField = "createdAt",
        sortOrder = "desc",
        page = "1",
        limit = "10",
        movementType,
        dateFrom,
        dateTo,
      } = req.query as InventoryMovementQuery;

      // Parse pagination parameters
      const currentPage = Math.max(1, parseInt(page));
      const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit))); // Max 100 items per page

      // Call service function
      const responseData = await inventory_movement_list(
        currentPage,
        itemsPerPage,
        search,
        sortField,
        sortOrder as "asc" | "desc",
        movementType,
        dateFrom,
        dateTo
      );

      // Send successful response
      successHandler(
        responseData,
        res,
        "GET",
        "READ Inventory Movement successfully"
      );
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }
);
export const inventoryMovementGroupedByBatch = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      const {
        batchNumber,
        referenceNumber,
        batchAndReference,
        page,
        limit,
        dateFrom,
        dateTo,
        movementType,
      } = req.query;

      const result = await getInventoryMovementsGroupedByBatch({
        batchNumber: batchNumber as string,
        referenceNumber: referenceNumber as string,
        batchAndReference: batchAndReference as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        movementType: movementType as string,
      });

      successHandler(
        result,
        res,
        "GET",
        "Read Inventory Movement grouped by batch successfully"
      );
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }
);

export const inventoryMovementCREATE = expressAsyncHandler(
  async (req: Request, res: Response) => {
    successHandler(
      "Create",
      res,
      "POST",
      "Create Inventory Movement successfully"
    );
  }
);
export const inventoryMovementUPDATE = expressAsyncHandler(
  async (req: Request, res: Response) => {
    successHandler(
      "UPDATE",
      res,
      "GET",
      "UPDATE Inventory Movement successfully"
    );
  }
);
//INVENTORY ITEMS FETCH FUNCTION
export const read_Inventory_Items = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { search } = req.query;

    const whereClause = search
      ? {
          OR: [
            {
              product: {
                generic: {
                  name: {
                    contains: search as string,
                  },
                },
              },
            },
            {
              product: {
                brand: {
                  name: {
                    contains: search as string,
                  },
                },
              },
            },
          ],
        }
      : {};

    const items = await prisma.inventoryItem.findMany({
      where: {
        ...whereClause,
        status: "ACTIVE", // Only fetch active inventory items
        currentQuantity: {
          gt: 0, // Only fetch items with quantity greater than 0
        },
      },
      orderBy: {
        createdAt: "desc", // Changed to desc to show newest items first
      },
      select: {
        id: true,
        currentQuantity: true,
        retailPrice: true,
        costPrice: true,
        batch: { select: { batchNumber: true, expiryDate: true } },
        product: {
          select: {
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

    successHandler(
      items,
      res,
      "GET",
      "Reading all the items from the inventory"
    );
  }
);
// export const inventoryMovementDELETE = expressAsyncHandler(
//   async (req: Request, res: Response) => {
//     successHandler(
//       "DELETE",
//       res,
//       "GET",
//       "DELETE Inventory Movement successfully"
//     );
//   }
// );

//==========================================For Zyre MS Controller===========================================================================================
export const salesInventoryProducts = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const salesInventory = await prisma.inventoryBatch.findMany({
      select: {
        batchNumber: true,
        expiryDate: true,
        items: {
          select: {
            retailPrice: true,
            product: {
              select: {
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
        },
      },
    });

    // Transform the data to a cleaner format
    const cleanedData = salesInventory.flatMap((batch) =>
      batch.items.map((item) => ({
        genericName: item.product.generic.name,
        brandName: item.product.brand.name,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        retailPrice: item.retailPrice,
      }))
    );

    successHandler(
      cleanedData,
      res,
      "GET",
      "Inventory sales items stock products fetched successfully"
    );
  }
);

//REPORT MANAGEMENT
export const inventory_report = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { dateFrom, dateTo, format } = req.query;

    // Validate date inputs
    if (!dateFrom || !dateTo) {
      throw new Error("Both dateFrom and dateTo are required");
    }

    const from = parseISO(dateFrom as string);
    const to = parseISO(dateTo as string);

    if (!isValid(from) || !isValid(to)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }
    if (from > to) {
      throw new Error("dateFrom must be before or equal to dateTo");
    }

    // Apply time adjustments: start of day for from, end of day for to
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Build where clause for inventory batches - get all inventory within date range
    const whereClause: any = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    // Fetch inventory batches with items in date range
    let inventoryBatches = await prisma.inventoryBatch.findMany({
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
            status: true,
            lastUpdateReason: true,
            product: {
              select: {
                generic: { select: { name: true } },
                brand: { select: { name: true } },
                categories: { select: { name: true } },
                safetyStock: true,
                averageCostPrice: true,
                averageRetailPrice: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Fetch low stock items (based on createdAt date range)
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        status: "ACTIVE",
        batch: {
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
      },
      include: {
        batch: {
          include: {
            supplier: true,
            district: true,
          },
        },
        product: {
          select: {
            generic: { select: { name: true } },
            brand: { select: { name: true } },
            categories: { select: { name: true } },
            safetyStock: true,
          },
        },
      },
      orderBy: {
        currentQuantity: "asc",
      },
    });

    // Filter items that are at or below safety stock
    const filteredLowStockItems = lowStockItems.filter(
      (item) => item.currentQuantity <= item.product.safetyStock
    );

    // Fetch expired items (based on expiry date range)
    const expiredItems = await prisma.inventoryItem.findMany({
      where: {
        batch: {
          expiryDate: {
            gte: fromDate,
            lte: toDate,
          },
        },
      },
      include: {
        batch: {
          include: {
            supplier: true,
            district: true,
          },
        },
        product: {
          select: {
            generic: { select: { name: true } },
            brand: { select: { name: true } },
            categories: { select: { name: true } },
          },
        },
      },
      orderBy: {
        batch: {
          expiryDate: "asc",
        },
      },
    });

    // Calculate summary statistics
    const summary = {
      totalBatches: inventoryBatches.length,
      totalItems: inventoryBatches.reduce(
        (sum, batch) => sum + batch.items.length,
        0
      ),
      totalValue: inventoryBatches.reduce(
        (sum, batch) =>
          sum +
          batch.items.reduce(
            (itemSum, item) =>
              itemSum + Number(item.costPrice) * Number(item.currentQuantity),
            0
          ),
        0
      ),
      totalRetailValue: inventoryBatches.reduce(
        (sum, batch) =>
          sum +
          batch.items.reduce(
            (itemSum, item) =>
              itemSum + Number(item.retailPrice) * Number(item.currentQuantity),
            0
          ),
        0
      ),
      totalLowStockItems: filteredLowStockItems.length,
      totalExpiredItems: expiredItems.length,
      // Calculate expired items losses
      totalExpiredCostLoss: expiredItems.reduce(
        (sum, item) =>
          sum + Number(item.costPrice) * Number(item.currentQuantity),
        0
      ),
      totalExpiredProfitLoss: expiredItems.reduce(
        (sum, item) =>
          sum +
          (Number(item.retailPrice) - Number(item.costPrice)) *
            Number(item.currentQuantity),
        0
      ),
      dateFrom: dateFrom,
      dateTo: dateTo,
    };

    // Excel export logic - save to server
    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();

      // Function to get status color
      const getStatusColor = (status: string) => {
        switch (status) {
          case "ACTIVE":
            return {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: "FF4CAF50" },
            }; // Green
          case "EXPIRED":
            return {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: "FFFF5722" },
            }; // Red
          case "DAMAGED":
            return {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: "FFFF9800" },
            }; // Orange
          case "RECALLED":
            return {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: "FF9C27B0" },
            }; // Purple
          case "SOLD_OUT":
            return {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: "FF607D8B" },
            }; // Blue Grey
          default:
            return {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: "FFFFFFFF" },
            }; // White
        }
      };

      // SHEET 1: Overall Inventory Report
      const overallWorksheet = workbook.addWorksheet("Overall Inventory");

      overallWorksheet.columns = [
        { header: "Status", key: "status", width: 25 },
        { header: "Reference #", key: "referenceNumber", width: 25 },
        { header: "Batch Number", key: "batchNumber", width: 18 },
        { header: "Supplier", key: "supplier", width: 50 },
        { header: "District", key: "district", width: 30 },
        { header: "Invoice Number", key: "invoiceNumber", width: 18 },
        { header: "Invoice Date", key: "invoiceDate", width: 20 },
        { header: "Expiry Date", key: "expiryDate", width: 20 },
        { header: "Manufacturing Date", key: "manufacturingDate", width: 20 },
        { header: "Product Brand", key: "productBrand", width: 20 },
        { header: "Product Generic", key: "productGeneric", width: 50 },
        { header: "Product Categories", key: "productCategories", width: 25 },
        { header: "Initial Qty", key: "initialQty", width: 12 },
        { header: "Current Qty", key: "currentQty", width: 12 },
        { header: "Safety Stock", key: "safetyStock", width: 12 },
        { header: "Cost Price", key: "costPrice", width: 12 },
        { header: "Retail Price", key: "retailPrice", width: 12 },
        { header: "Total Cost Value", key: "totalCostValue", width: 15 },
        { header: "Total Retail Value", key: "totalRetailValue", width: 15 },
        { header: "Received By", key: "receivedBy", width: 40 },
        { header: "Verified By", key: "verifiedBy", width: 40 },
        { header: "Created By", key: "createdBy", width: 30 },
      ];

      // Add title and date for Overall Inventory sheet
      overallWorksheet.insertRow(1, ["Overall Inventory Report"]);
      overallWorksheet.mergeCells(1, 1, 1, overallWorksheet.columns.length);
      const overallTitleRow = overallWorksheet.getRow(1);
      overallTitleRow.font = { size: 18, bold: true };
      overallTitleRow.alignment = { vertical: "middle", horizontal: "center" };
      overallTitleRow.height = 40;

      const overallDateGenerated = `Date generated: ${new Date().toLocaleString()} | Date Range: ${dateFrom} to ${dateTo}`;
      overallWorksheet.insertRow(2, [overallDateGenerated]);
      overallWorksheet.mergeCells(2, 1, 2, overallWorksheet.columns.length);
      const overallDateRow = overallWorksheet.getRow(2);
      overallDateRow.font = { italic: true, size: 10 };
      overallDateRow.alignment = { vertical: "middle", horizontal: "right" };
      overallDateRow.height = 25;

      // Add data rows for Overall Inventory
      inventoryBatches.forEach((batch) => {
        batch.items.forEach((item) => {
          const totalCostValue =
            Number(item.costPrice) * Number(item.currentQuantity);
          const totalRetailValue =
            Number(item.retailPrice) * Number(item.currentQuantity);

          const row = overallWorksheet.addRow({
            status: item.status,
            referenceNumber: batch.referenceNumber,
            batchNumber: batch.batchNumber,
            supplier: batch.supplier?.name,
            district: batch.district?.name,
            invoiceNumber: batch.invoiceNumber,
            invoiceDate: batch.invoiceDate,
            expiryDate: batch.expiryDate,
            manufacturingDate: batch.manufacturingDate,
            productBrand: item.product.brand?.name,
            productGeneric: item.product.generic?.name,
            productCategories: Array.isArray(item.product.categories)
              ? item.product.categories.map((c) => c.name).join(", ")
              : "",
            initialQty: item.initialQuantity,
            currentQty: item.currentQuantity,
            safetyStock: item.product.safetyStock,
            costPrice: parseInt(item.costPrice.toString()),
            retailPrice: parseInt(item.retailPrice.toString()),
            totalCostValue: totalCostValue,
            totalRetailValue: totalRetailValue,
            receivedBy: batch.receivedBy,
            verifiedBy: batch.verifiedBy,
            createdBy: batch.createdBy?.fullname,
          });

          // Apply color coding to status cell
          const statusCell = row.getCell(1);
          statusCell.fill = getStatusColor(item.status);
          statusCell.font = { bold: true, color: { argb: "FF000000" } };

          // Apply light red background to entire row if expired
          if (item.status === "EXPIRED") {
            row.eachCell((cell) => {
              cell.fill = {
                type: "pattern" as const,
                pattern: "solid" as const,
                fgColor: { argb: "FFFFEBEE" }, // Light red background
              };
            });
          }

          // Apply light orange background to entire row if low stock (but not expired)
          if (
            item.status !== "EXPIRED" &&
            item.currentQuantity <= item.product.safetyStock
          ) {
            row.eachCell((cell) => {
              cell.fill = {
                type: "pattern" as const,
                pattern: "solid" as const,
                fgColor: { argb: "FFFFF3E0" }, // Light orange background
              };
            });
          }
        });
      });

      // Style Overall Inventory sheet
      overallWorksheet.eachRow((row, rowNumber) => {
        row.alignment = { vertical: "middle", horizontal: "center" };
        // Add borders to all cells in data rows (skip title and date rows)
        if (rowNumber > 2) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        }
      });
      overallWorksheet.getRow(3).font = { bold: true };

      // Add summary for Overall Inventory
      let lastOverallRow = overallWorksheet.lastRow
        ? overallWorksheet.lastRow.number
        : overallWorksheet.rowCount;
      overallWorksheet.addRow([]);
      overallWorksheet.addRow([`Total Batches:`, summary.totalBatches]);
      overallWorksheet.addRow([`Total Items:`, summary.totalItems]);
      overallWorksheet.addRow([
        `Total Cost Value:`,
        `₱${summary.totalValue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);
      overallWorksheet.addRow([
        `Total Retail Value:`,
        `₱${summary.totalRetailValue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);

      for (let i = lastOverallRow + 2; i <= lastOverallRow + 5; i++) {
        const summaryRow = overallWorksheet.getRow(i);
        summaryRow.font = { bold: true };
        summaryRow.alignment = { vertical: "middle", horizontal: "center" };
      }

      // SHEET 2: Low Stock Report
      const lowStockWorksheet = workbook.addWorksheet("Low Stock");

      lowStockWorksheet.columns = [
        { header: "Product Brand", key: "productBrand", width: 20 },
        { header: "Product Generic", key: "productGeneric", width: 50 },
        { header: "Categories", key: "categories", width: 25 },
        { header: "Batch Number", key: "batchNumber", width: 18 },
        { header: "Supplier", key: "supplier", width: 50 },
        { header: "Current Qty", key: "currentQty", width: 12 },
        { header: "Safety Stock", key: "safetyStock", width: 12 },
        { header: "Deficit", key: "deficit", width: 12 },
        { header: "Cost Price", key: "costPrice", width: 12 },
        { header: "Total Value", key: "totalValue", width: 15 },
        { header: "Expiry Date", key: "expiryDate", width: 20 },
      ];

      // Add title and date for Low Stock sheet
      lowStockWorksheet.insertRow(1, ["Low Stock Report"]);
      lowStockWorksheet.mergeCells(1, 1, 1, lowStockWorksheet.columns.length);
      lowStockWorksheet.getRow(1).font = { size: 18, bold: true };
      lowStockWorksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      const lowStockDateInfo = `Date generated: ${new Date().toLocaleString()} | Date Range: ${dateFrom} to ${dateTo}`;
      lowStockWorksheet.insertRow(2, [lowStockDateInfo]);
      lowStockWorksheet.mergeCells(2, 1, 2, lowStockWorksheet.columns.length);
      lowStockWorksheet.getRow(2).font = { italic: true, size: 10 };
      lowStockWorksheet.getRow(2).alignment = {
        vertical: "middle",
        horizontal: "right",
      };

      // Add data for Low Stock
      filteredLowStockItems.forEach((item) => {
        const deficit = item.product.safetyStock - item.currentQuantity;
        const totalValue =
          Number(item.costPrice) * Number(item.currentQuantity);

        lowStockWorksheet.addRow({
          productBrand: item.product.brand?.name,
          productGeneric: item.product.generic?.name,
          categories: Array.isArray(item.product.categories)
            ? item.product.categories.map((c) => c.name).join(", ")
            : "",
          batchNumber: item.batch.batchNumber,
          supplier: item.batch.supplier?.name,
          currentQty: item.currentQuantity,
          safetyStock: item.product.safetyStock,
          deficit: deficit,
          costPrice: parseInt(item.costPrice.toString()),
          totalValue: totalValue,
          expiryDate: item.batch.expiryDate,
        });
      });

      // Style Low Stock sheet
      lowStockWorksheet.eachRow((row, rowNumber) => {
        row.alignment = { vertical: "middle", horizontal: "center" };
        // Add borders to all cells in data rows (skip title and date rows)
        if (rowNumber > 2) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        }
      });
      lowStockWorksheet.getRow(3).font = { bold: true };

      // Add summary for Low Stock
      let lastLowStockRow = lowStockWorksheet.lastRow
        ? lowStockWorksheet.lastRow.number
        : lowStockWorksheet.rowCount;
      lowStockWorksheet.addRow([]);
      lowStockWorksheet.addRow([
        `Total Low Stock Items:`,
        summary.totalLowStockItems,
      ]);

      const lowStockSummaryRow = lowStockWorksheet.getRow(lastLowStockRow + 2);
      lowStockSummaryRow.font = { bold: true };
      lowStockSummaryRow.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // SHEET 3: Expired Products Report
      const expiredWorksheet = workbook.addWorksheet("Expired Products");

      expiredWorksheet.columns = [
        { header: "Product Brand", key: "productBrand", width: 20 },
        { header: "Product Generic", key: "productGeneric", width: 50 },
        { header: "Categories", key: "categories", width: 25 },
        { header: "Batch Number", key: "batchNumber", width: 18 },
        { header: "Supplier", key: "supplier", width: 50 },
        { header: "Current Qty", key: "currentQty", width: 12 },
        { header: "Cost Price", key: "costPrice", width: 12 },
        { header: "Total Value", key: "totalValue", width: 15 },
        { header: "Expiry Date", key: "expiryDate", width: 20 },
        { header: "Days Expired", key: "daysExpired", width: 15 },
      ];

      // Add title and date for Expired Products sheet
      expiredWorksheet.insertRow(1, ["Expired Products Report"]);
      expiredWorksheet.mergeCells(1, 1, 1, expiredWorksheet.columns.length);
      expiredWorksheet.getRow(1).font = { size: 18, bold: true };
      expiredWorksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      const expiredDateInfo = `Date generated: ${new Date().toLocaleString()} | Date Range: ${dateFrom} to ${dateTo}`;
      expiredWorksheet.insertRow(2, [expiredDateInfo]);
      expiredWorksheet.mergeCells(2, 1, 2, expiredWorksheet.columns.length);
      expiredWorksheet.getRow(2).font = { italic: true, size: 10 };
      expiredWorksheet.getRow(2).alignment = {
        vertical: "middle",
        horizontal: "right",
      };

      // Add data for Expired Products
      expiredItems.forEach((item) => {
        const totalValue =
          Number(item.costPrice) * Number(item.currentQuantity);
        const daysExpired = Math.floor(
          (new Date().getTime() - item.batch.expiryDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        expiredWorksheet.addRow({
          productBrand: item.product.brand?.name,
          productGeneric: item.product.generic?.name,
          categories: Array.isArray(item.product.categories)
            ? item.product.categories.map((c) => c.name).join(", ")
            : "",
          batchNumber: item.batch.batchNumber,
          supplier: item.batch.supplier?.name,
          currentQty: item.currentQuantity,
          costPrice: parseInt(item.costPrice.toString()),
          totalValue: totalValue,
          expiryDate: item.batch.expiryDate,
          daysExpired: daysExpired,
        });
      });

      // Style Expired Products sheet
      expiredWorksheet.eachRow((row, rowNumber) => {
        row.alignment = { vertical: "middle", horizontal: "center" };
        // Add borders to all cells in data rows (skip title and date rows)
        if (rowNumber > 2) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        }
      });
      expiredWorksheet.getRow(3).font = { bold: true };

      // Add summary for Expired Products
      let lastExpiredRow = expiredWorksheet.lastRow
        ? expiredWorksheet.lastRow.number
        : expiredWorksheet.rowCount;
      expiredWorksheet.addRow([]);
      expiredWorksheet.addRow([
        `Total Expired Items:`,
        summary.totalExpiredItems,
      ]);
      expiredWorksheet.addRow([
        `Total Cost Loss:`,
        `₱${summary.totalExpiredCostLoss.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);
      expiredWorksheet.addRow([
        `Total Profit Loss:`,
        `₱${summary.totalExpiredProfitLoss.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);

      const expiredSummaryRow = expiredWorksheet.getRow(lastExpiredRow + 2);
      expiredSummaryRow.font = { bold: true };
      expiredSummaryRow.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // Style the additional summary rows
      for (let i = lastExpiredRow + 3; i <= lastExpiredRow + 4; i++) {
        const summaryRow = expiredWorksheet.getRow(i);
        summaryRow.font = { bold: true };
        summaryRow.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Save the workbook
      const reportsDir = path.join(process.cwd(), "public/reports/inventory");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const dateFromFormatted = formatDate(from, "yyyy-MM-dd");
      const dateToFormatted = formatDate(to, "yyyy-MM-dd");
      const filename = `Inventory_Report_(${dateFromFormatted}_to_${dateToFormatted}).xlsx`;
      const filePath = path.join(reportsDir, filename);

      if (fs.existsSync(filePath)) {
        throw new Error(
          `An inventory report for the date range ${dateFromFormatted} to ${dateToFormatted} already exists. Please delete the existing file first or use a different date range.`
        );
      }

      try {
        await workbook.xlsx.writeFile(filePath);
      } catch (err) {
        console.error("Failed to write Excel file:", err);
        throw new Error("Failed to save Excel report on server");
      }

      const downloadUrl = `/api/v1/inventory/report/download/${filename}`;
      successHandler(
        { message: "Excel report generated", url: downloadUrl },
        res,
        "GET",
        "Inventory report generated and saved successfully"
      );
      return;
    }

    successHandler(
      {
        summary,
        inventoryBatches,
        lowStockItems: filteredLowStockItems,
        expiredItems,
      },
      res,
      "GET",
      "Inventory report generated successfully"
    );
  }
);

export const getInventoryReportFiles = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Define the reports directory path
      const reportsDir = path.join(process.cwd(), "public/reports/inventory");

      // Check if directory exists
      if (!fs.existsSync(reportsDir)) {
        return successHandler(
          { files: [] },
          res,
          "GET",
          "No reports directory found"
        );
      }

      // Read all files in the directory
      const files = fs.readdirSync(reportsDir);

      // Filter for Excel files and get file details
      const reportFiles = files
        .filter((file) => file.endsWith(".xlsx"))
        .map((file) => {
          const filePath = path.join(reportsDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            size: stats.size,
            createdDate: stats.birthtime,
            modifiedDate: stats.mtime,
            downloadUrl: `/api/v1/inventory/report/download/${file}`,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.modifiedDate).getTime() -
            new Date(a.modifiedDate).getTime()
        ); // Sort by most recent first

      successHandler(
        { files: reportFiles },
        res,
        "GET",
        "Inventory report files retrieved successfully"
      );
    } catch (error: any) {
      throw new Error(`Failed to read report files: ${error.message}`);
    }
  }
);

export const downloadAndDeleteInventoryReport = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;

      // Validate filename to prevent directory traversal attacks
      if (!filename || !filename.endsWith(".xlsx")) {
        throw new Error("Invalid filename");
      }

      // Define the reports directory path
      const reportsDir = path.join(process.cwd(), "public/reports/inventory");
      const filePath = path.join(reportsDir, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error("File not found");
      }

      // Get file stats for headers
      const stats = fs.statSync(filePath);

      // Set headers for file download
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", stats.size);

      // Create read stream and pipe to response
      const fileStream = fs.createReadStream(filePath);

      // Handle stream events
      fileStream.on("error", (error) => {
        console.error("Error reading file:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error reading file" });
        }
      });

      // Delete file after stream ends
      fileStream.on("end", () => {
        try {
          fs.unlinkSync(filePath);
          console.log(`File ${filename} deleted after download`);
        } catch (deleteError) {
          console.error("Error deleting file after download:", deleteError);
        }
      });

      // Pipe the file to response
      fileStream.pipe(res);
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(404).json({ error: error.message || "File not found" });
      }
    }
  }
);

// Get all products with their current inventory values from any batch
export const getAllProductsWithInventory = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const search = (req.query.search as string)?.toLowerCase() || "";
    const brandId = req.query.brandId
      ? parseInt(req.query.brandId as string)
      : undefined;
    const genericId = req.query.genericId
      ? parseInt(req.query.genericId as string)
      : undefined;
    const companyId = req.query.companyId
      ? parseInt(req.query.companyId as string)
      : undefined;

    try {
      // Build the where clause for products
      const productWhere: Prisma.ProductWhereInput = {
        isActive: true,
        AND: [
          search
            ? {
                OR: [
                  { brand: { name: { contains: search } } },
                  { generic: { name: { contains: search } } },
                  { company: { name: { contains: search } } },
                ],
              }
            : {},
          brandId ? { brandId } : {},
          genericId ? { genericId } : {},
          companyId ? { companyId } : {},
        ],
      };

      // Get products with their related data
      const products = await prisma.product.findMany({
        where: productWhere,
        include: {
          brand: true,
          generic: true,
          company: true,
          inventoryItems: {
            where: {
              batch: {
                status: "ACTIVE",
                isActive: true,
              },
              currentQuantity: {
                gt: 0,
              },
            },
            include: {
              batch: {
                select: {
                  id: true,
                  batchNumber: true,
                  supplier: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  expiryDate: true,
                  invoiceDate: true,
                },
              },
            },
          },
        },
        orderBy: {
          id: "asc", // Default order, will be sorted after processing
        },
      });

      // Get total count for pagination
      const totalProducts = await prisma.product.count({
        where: productWhere,
      });

      // Process the data to calculate inventory totals
      const processedProducts = products
        .map((product) => {
          const totalCurrentQuantity = product.inventoryItems.reduce(
            (sum, item) => sum + item.currentQuantity,
            0
          );

          return {
            id: product.id,
            genericName: product.generic.name,
            brandName: product.brand.name,
            companyName: product.company.name,
            totalCurrentQuantity,
          };
        })
        .sort((a, b) => b.totalCurrentQuantity - a.totalCurrentQuantity); // Sort by quantity descending

      // Calculate summary statistics
      const summary = {
        totalProducts: totalProducts,
        totalProductsWithInventory: processedProducts.filter(
          (p) => p.totalCurrentQuantity > 0
        ).length,
        totalCurrentInventory: processedProducts.reduce(
          (sum, p) => sum + p.totalCurrentQuantity,
          0
        ),
      };

      successHandler(
        {
          products: processedProducts,
          summary,
        },
        res,
        "GET",
        "Products with inventory data fetched successfully"
      );
    } catch (error: any) {
      throw new Error(
        `Failed to fetch products with inventory: ${error.message}`
      );
    }
  }
);
