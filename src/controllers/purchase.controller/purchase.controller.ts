import { AuthRequest } from "@middlewares/authMiddleware";
import { ActionType, Prisma, PrismaClient } from "@prisma/client";
import { purchase_return_create } from "@services/purchase.services/create.purchase.return.service";
import { purchase_create } from "@services/purchase.services/create.service";
import { purchase_list } from "@services/purchase.services/read.service";
import { purchase_list_to_inventory } from "@services/purchase.services/read_purchaseToInventory.service";
import {
  PurchaseUpdateData,
  updatePurchase,
} from "@services/purchase.services/update.service";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { validatePurchaseUpdateRequest } from "./puchase.validator";
import { PurchaseEditQuery } from "src/types/purchase.types";
import { read_purchaseReturnList_service } from "@services/purchase.services/read_purchaseReturnList.service";
import { read_purchaseEditLists_service } from "@services/purchase.services/read_purchaseEditLists.service";
import { verifyPurchase_service } from "@services/purchase.services/verify.purchase.service";
import { update_status_purchase_return_service } from "@services/purchase.services/update_status_purchase_return.service";
import { parseISO, isValid, format as formatDate } from "date-fns";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// CREATE Purchase
export const create = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const batches = await purchase_create(req.body, req.user!.id);

    if (req.user?.id) {
      for (const batch of batches) {
        await prisma.activityLog.create({
          data: {
            userId: req.user.id,
            model: "Purchase",
            recordId: batch.id,
            action: ActionType.CREATE,
            description: `Created pruchase batch #${batch.batchNumber} (ID ${batch.id})`,
            ipAddress: req.ip,
            userAgent: (req.headers["user-agent"] as string) || null,
          },
        });
      }
    }

    successHandler(
      "Purchase created successfully",
      res,
      "POST",
      `Successfully created ${batches.length} purchase batch(es) with their items`
    );
  }
);
//Create Purchase Return
export const create_purchase_return = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const purchaseReturn = await purchase_return_create(req.body, req.user!.id);

    successHandler(
      "Purchase return created successfully",
      res,
      "POST",
      "Purchase return created successfully"
    );
  }
);
export const update_status_purchase_return = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { returnId, status, notes } = req.body;
    const userId = req.user!.id;

    try {
      const result = await update_status_purchase_return_service({
        returnId,
        status,
        notes,
        userId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      successHandler(
        "Purchase return status updated successfully",
        res,
        "PUT",
        `Purchase return status updated to ${status} successfully`
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to update purchase return status"
      );
    }
  }
);
// READ Purchase
export const read = expressAsyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string)?.toLowerCase() || "";

  // New filter inputs
  const sortField = req.query.sortField as string; // e.g., "invoice date"
  const sortOrder =
    (req.query.sortOrder as string)?.toLowerCase() === "asc" ? "asc" : "desc"; // default to desc

  const status = (req.query.status as string) || "ALL";

  // Date filter inputs
  const dateFrom = req.query.dateFrom as string;
  const dateTo = req.query.dateTo as string;

  const { purchases, pagination, summary } = await purchase_list(
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
    { purchases, pagination, summary },
    res,
    "GET",
    "Purchases fetched successfully"
  );
});
//READ Purchase to be added to inventory
export const read_purchaseToInventory = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string)?.toLowerCase() || "";

    // New filter inputs
    const sortField = req.query.sortField as string; // e.g., "invoice date"
    const sortOrder =
      (req.query.sortOrder as string)?.toLowerCase() === "asc" ? "asc" : "desc"; // default to desc

    const { purchases, pagination } = await purchase_list_to_inventory(
      page,
      limit,
      search,
      sortField,
      sortOrder
    );

    successHandler(
      { purchases, pagination },
      res,
      "GET",
      "Unconverted purchases fetched successfully"
    );
  }
);
//READ Purchase Updated
export const read_purchaseToUpdate = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate ID parameter
    const purchaseId = parseInt(id);
    if (isNaN(purchaseId) || purchaseId <= 0) {
      throw new Error("Invalid purchase ID provided");
    }

    // Fetch purchase with optimized query
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true,
        batchNumber: true,
        supplierId: true,
        districtId: true,
        dt: true,
        invoiceNumber: true,
        invoiceDate: true,
        expiryDate: true,
        manufacturingDate: true,
        createdById: true,
        status: true,
        receivedBy: true,
        verifiedBy: true,
        verificationDate: true,
        district: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          select: {
            id: true,
            initialQuantity: true,
            currentQuantity: true,
            costPrice: true,
            retailPrice: true,
            lastUpdateReason: true,
            product: {
              select: {
                id: true,
                generic: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                brand: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Handle case where purchase is not found
    if (!purchase) {
      throw new Error("Purchase not found");
    }

    // Check if this purchase batch exists in inventory
    const inventoryBatch = await prisma.inventoryBatch.findFirst({
      where: {
        batchNumber: purchase.batchNumber,
        supplierId: purchase.supplierId,
      },
      select: {
        id: true,
        batchNumber: true,
        items: {
          select: {
            id: true,
            productId: true,
            initialQuantity: true,
            currentQuantity: true,
            costPrice: true,
            retailPrice: true,
          },
        },
      },
    });

    // Helper function to compare purchase items with inventory items
    const getInventoryComparison = () => {
      if (!inventoryBatch) {
        return {
          exists: false,
          message:
            "This purchase batch has not been transferred to inventory yet.",
          changes: [],
        };
      }

      const changes: any[] = [];

      purchase.items.forEach((purchaseItem) => {
        const inventoryItem = inventoryBatch.items.find(
          (invItem) => invItem.productId === purchaseItem.product.id
        );

        if (inventoryItem) {
          const itemChanges: any = {
            productName: `${purchaseItem.product.brand.name} (${purchaseItem.product.generic.name})`,
            changes: [],
          };

          // Compare quantities
          if (purchaseItem.initialQuantity !== inventoryItem.initialQuantity) {
            itemChanges.changes.push({
              field: "Initial Quantity",
              purchase: purchaseItem.initialQuantity,
              inventory: inventoryItem.initialQuantity,
              difference:
                inventoryItem.initialQuantity - purchaseItem.initialQuantity,
            });
          }

          if (purchaseItem.currentQuantity !== inventoryItem.currentQuantity) {
            itemChanges.changes.push({
              field: "Current Quantity",
              purchase: purchaseItem.currentQuantity,
              inventory: inventoryItem.currentQuantity,
              difference:
                inventoryItem.currentQuantity - purchaseItem.currentQuantity,
            });
          }

          // Compare prices
          const purchaseCostPrice = parseFloat(
            purchaseItem.costPrice.toString()
          );
          const inventoryCostPrice = parseFloat(
            inventoryItem.costPrice.toString()
          );
          if (purchaseCostPrice !== inventoryCostPrice) {
            itemChanges.changes.push({
              field: "Cost Price",
              purchase: purchaseCostPrice,
              inventory: inventoryCostPrice,
              difference: inventoryCostPrice - purchaseCostPrice,
            });
          }

          const purchaseRetailPrice = parseFloat(
            purchaseItem.retailPrice.toString()
          );
          const inventoryRetailPrice = parseFloat(
            inventoryItem.retailPrice.toString()
          );
          if (purchaseRetailPrice !== inventoryRetailPrice) {
            itemChanges.changes.push({
              field: "Retail Price",
              purchase: purchaseRetailPrice,
              inventory: inventoryRetailPrice,
              difference: inventoryRetailPrice - purchaseRetailPrice,
            });
          }

          // Only add to changes if there are actual differences
          if (itemChanges.changes.length > 0) {
            changes.push(itemChanges);
          }
        } else {
          // Product exists in purchase but not in inventory
          changes.push({
            productName: `${purchaseItem.product.brand.name} (${purchaseItem.product.generic.name})`,
            status: "Missing from inventory",
          });
        }
      });

      // Check for products in inventory that don't exist in purchase
      inventoryBatch.items.forEach((inventoryItem) => {
        const purchaseItem = purchase.items.find(
          (pItem) => pItem.product.id === inventoryItem.productId
        );

        if (!purchaseItem) {
          changes.push({
            productId: inventoryItem.productId,
            status: "Added to inventory (not in original purchase)",
          });
        }
      });

      return {
        exists: true,
        message:
          changes.length > 0
            ? `This purchase batch exists in inventory with ${changes.length} difference(s).`
            : "This purchase batch exists in inventory with no changes.",
        changes,
      };
    };

    const inventoryComparison = getInventoryComparison();

    // Transform the data for cleaner output
    const transformedPurchase = {
      id: purchase.id,
      batchNumber: purchase.batchNumber,
      invoiceDetails: {
        number: purchase.invoiceNumber,
        date: purchase.invoiceDate,
      },
      dates: {
        manufacturing: purchase.manufacturingDate,
        expiry: purchase.expiryDate,
      },
      location: {
        district: purchase.district,
        supplier: purchase.supplier,
      },
      verification: {
        receivedBy: purchase.receivedBy,
        verifiedBy: purchase.verifiedBy,
        status: purchase.status,
        verification: purchase.verificationDate,
      },
      documentType: purchase.dt,
      items: purchase.items.map((item) => ({
        id: item.id,
        product: {
          id: item.product.id,
          name: `${item.product.brand.name} (${item.product.generic.name})`,
          generic: item.product.generic,
          brand: item.product.brand,
        },
        quantity: {
          initial: item.initialQuantity,
          current: item.currentQuantity,
          available: item.currentQuantity, // Alias for clarity
        },
        pricing: {
          cost: parseFloat(item.costPrice.toString()),
          retail: parseFloat(item.retailPrice.toString()),
        },
        lastUpdateReason: item.lastUpdateReason,
      })),
      inventoryStatus: inventoryComparison,
    };

    successHandler(
      transformedPurchase,
      res,
      "GET",
      "Purchase details retrieved successfully"
    );
  }
);
//================================================================================================================================================================
//READ Purchase Return Lists
export const read_purchaseReturnList = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Call the service with query parameters
      const result = await read_purchaseReturnList_service(req.query);

      // Send response using successHandler
      successHandler(
        result,
        res,
        "GET",
        "Purchase returns retrieved successfully"
      );
    } catch (error: any) {
      throw new Error(error); // Let the error handler middleware handle it
    }
  }
);
//READ Purchase Edit Logs
export const read_purchaseEditLists = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = "1",
      limit = "10",
      search = "",
      sortField = "editedAt",
      sortOrder = "desc",
    } = req.query as PurchaseEditQuery;

    const result = await read_purchaseEditLists_service({
      page,
      limit,
      search,
      sortField,
      sortOrder,
    });

    successHandler(result, res, "GET", "Purchase edit retrieved successfully");
  }
);
// READ Single Purchase by ID
export const readById = expressAsyncHandler(
  async (req: Request, res: Response) => {
    successHandler(
      "Read Single Purchase",
      res,
      "GET",
      "Purchase fetched successfully"
    );
  }
);
// UPDATE Purchase
export const update = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    // 1. Extract and validate IDs and body
    const purchaseId = parseInt(req.params.id, 10);
    const updateData: PurchaseUpdateData = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("Unauthorized access");
    }

    if (!purchaseId || isNaN(purchaseId)) {
      throw new Error("Invalid purchase ID");
    }

    try {
      await validatePurchaseUpdateRequest(purchaseId, updateData, userId);
      // 2. Delegate all business logic to service
      const result = await updatePurchase(
        purchaseId,
        updateData,
        userId,
        req.ip || "unknown",
        req.get("User-Agent") || ""
      );

      //When Update is successful, reset verification fields
      await prisma.purchase.update({
        where: { id: purchaseId },
        data: {
          verifiedBy: null,
          verificationDate: null,
        },
      });

      // 3. Return standardized success response
      successHandler(
        result,
        res,
        "PUT",
        "Purchase and related items updated successfully"
      );
    } catch (error: any) {
      console.error("Purchase update error:", error);

      // 4. Preserve your existing error messages
      if (error.message === "Purchase not found") {
        throw new Error("Purchase not found");
      }
      if ((error as Prisma.PrismaClientKnownRequestError).code === "P2002") {
        throw new Error(
          "Duplicate entry: Batch number already exists for this supplier"
        );
      }
      if ((error as Prisma.PrismaClientKnownRequestError).code === "P2003") {
        throw new Error(
          "Invalid reference: Check supplier, district, or product IDs"
        );
      }

      // 5. Fallback
      throw new Error(error.message || "Failed to update purchase");
    }
  }
);
// DELETE Purchase (Soft delete - set isActive to false)
export const remove = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Purchase Deleted Successfully",
      res,
      "DELETE",
      "Purchase deactivated successfully"
    );
  }
);
// RESTORE Purchase (Reactivate soft-deleted Purchase)
export const restore = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Purchase Restored Successfully",
      res,
      "PUT",
      "Purchase restored successfully"
    );
  }
);
export const verify = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const purchaseId = parseInt(req.params.id, 10);
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("Unauthorized access");
    }

    if (!purchaseId || isNaN(purchaseId)) {
      throw new Error("Invalid purchase ID");
    }

    const result = await verifyPurchase_service({
      purchaseId,
      userId,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    successHandler(
      result,
      res,
      "PUT",
      `Purchase batch #${result.batchNumber} verified successfully by ${result.verification.verifiedBy}`
    );
  }
);

//REPORT MANAGEMENT
export const purchase_report = expressAsyncHandler(
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

    // Fetch purchases with items in date range
    const purchases = await prisma.purchase.findMany({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
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
      orderBy: { createdAt: "asc" },
    });

    // Optionally, add summary info here
    const summary = {
      totalPurchases: purchases.length,
      totalItems: purchases.reduce((sum, p) => sum + p.items.length, 0),
      totalAmount: purchases.reduce(
        (sum, p) =>
          sum +
          p.items.reduce(
            (itemSum, item) =>
              itemSum + Number(item.costPrice) * Number(item.initialQuantity),
            0
          ),
        0
      ),
      dateFrom: dateFrom,
      dateTo: dateTo,
    };

    // Excel export logic - save to server
    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Purchase Report");

      worksheet.columns = [
        { header: "Tracking #", key: "referenceNumber", width: 25 },
        { header: "Batch Number", key: "batchNumber", width: 18 },
        { header: "Supplier", key: "supplier", width: 50 },
        { header: "District", key: "district", width: 30 },
        { header: "Invoice Number", key: "invoiceNumber", width: 18 },
        { header: "Invoice Date", key: "invoiceDate", width: 20 },
        { header: "Product Brand", key: "productBrand", width: 20 },
        { header: "Product Generic", key: "productGeneric", width: 50 },
        { header: "Product Categories", key: "productCategories", width: 25 },
        { header: "Initial Qty", key: "initialQty", width: 12 },
        { header: "Current Qty", key: "currentQty", width: 12 },
        { header: "Cost Price", key: "costPrice", width: 12 },
        { header: "Retail Price", key: "retailPrice", width: 12 },
      ];

      // Add a title row at the top
      const title = "Purchase Report";
      worksheet.insertRow(1, [title]);
      worksheet.mergeCells(1, 1, 1, worksheet.columns.length);
      const titleRow = worksheet.getRow(1);
      titleRow.font = { size: 18, bold: true };
      titleRow.alignment = { vertical: "middle", horizontal: "center" };
      titleRow.height = 40; // Increase the height of the title row

      // Add a 'Date generated' row below the title
      const dateGenerated = `Date generated: ${new Date().toLocaleString()}`;
      worksheet.insertRow(2, [dateGenerated]);
      worksheet.mergeCells(2, 1, 2, worksheet.columns.length);
      const dateRow = worksheet.getRow(2);
      dateRow.font = { italic: true, size: 10 };
      dateRow.alignment = { vertical: "middle", horizontal: "right" };
      dateRow.height = 25;

      // Add data rows starting from row 4
      let dataStartRow = 4;
      purchases.forEach((purchase) => {
        purchase.items.forEach((item) => {
          worksheet.addRow({
            referenceNumber: purchase.referenceNumber,
            batchNumber: purchase.batchNumber,
            supplier: purchase.supplier?.name,
            district: purchase.district?.name,
            invoiceNumber: purchase.invoiceNumber,
            invoiceDate: purchase.invoiceDate,
            productBrand: item.product.brand?.name,
            productGeneric: item.product.generic?.name,
            productCategories: Array.isArray(item.product.categories)
              ? item.product.categories.map((c) => c.name).join(", ")
              : "",
            initialQty: item.initialQuantity,
            currentQty: item.currentQuantity,
            costPrice: parseInt(item.costPrice.toString()),
            retailPrice: parseInt(item.retailPrice.toString()),
          });
        });
      });

      // Center all cell values (headers and data)
      worksheet.eachRow((row, rowNumber) => {
        row.alignment = { vertical: "middle", horizontal: "center" };
      });

      // Make the header row bold (now row 3)
      const headerRow = worksheet.getRow(3);
      headerRow.font = { bold: true };

      // Add summary section after data rows
      // Defensive: get last data row index
      let lastDataRow = worksheet.lastRow
        ? worksheet.lastRow.number
        : worksheet.rowCount;
      worksheet.addRow([]); // Blank row
      worksheet.addRow([`Total Purchases:`, summary.totalPurchases]);
      //add here total items on all purchases generated
      worksheet.addRow([`Total Items:`, summary.totalItems]);

      worksheet.addRow([`Total Amount:`, summary.totalAmount]);
      const totalPurchasesRow = worksheet.getRow(lastDataRow + 2);
      const totalAmountRow = worksheet.getRow(lastDataRow + 3);
      totalPurchasesRow.font = { bold: true };
      totalAmountRow.font = { bold: true };
      totalPurchasesRow.alignment = { vertical: "middle", horizontal: "left" };
      totalAmountRow.alignment = { vertical: "middle", horizontal: "left" };

      // Use project root for reports directory
      const reportsDir = path.join(process.cwd(), "public/reports/purchase");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Generate a unique filename with date range
      const dateFromFormatted = formatDate(from, "yyyy-MM-dd");
      const dateToFormatted = formatDate(to, "yyyy-MM-dd");
      const filename = `Purchase_Report_(${dateFromFormatted}_to_${dateToFormatted}).xlsx`;
      const filePath = path.join(reportsDir, filename);

      // Check if file already exists for this date range
      if (fs.existsSync(filePath)) {
        throw new Error(
          `A purchase report for the date range ${dateFromFormatted} to ${dateToFormatted} already exists. Please delete the existing file first or use a different date range.`
        );
      }

      // Save the workbook to disk with error logging
      try {
        await workbook.xlsx.writeFile(filePath);
      } catch (err) {
        console.error("Failed to write Excel file:", err);
        throw new Error("Failed to save Excel report on server");
      }

      // Return the download URL (relative to public folder)
      const downloadUrl = `/api/v1/purchase/report/download/${filename}`;
      successHandler(
        { message: "Excel report generated", url: downloadUrl },
        res,
        "GET",
        "Purchase report generated and saved successfully"
      );
      return;
    }

    successHandler(
      { summary, purchases },
      res,
      "GET",
      "Purchase report generated successfully"
    );
  }
);
export const getReportFiles = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Define the reports directory path
      const reportsDir = path.join(process.cwd(), "public/reports/purchase");

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
            downloadUrl: `/api/v1/purchase/report/download/${file}`,
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
        "Purchase report files retrieved successfully"
      );
    } catch (error: any) {
      throw new Error(`Failed to read report files: ${error.message}`);
    }
  }
);
export const downloadAndDeleteReport = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;

      // Validate filename to prevent directory traversal attacks
      if (!filename || !filename.endsWith(".xlsx")) {
        throw new Error("Invalid filename");
      }

      // Define the reports directory path
      const reportsDir = path.join(process.cwd(), "public/reports/purchase");
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
