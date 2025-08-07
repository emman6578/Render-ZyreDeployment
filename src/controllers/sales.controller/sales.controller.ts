import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import expressAsyncHandler from "express-async-handler";
import { AuthRequest } from "@middlewares/authMiddleware";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import {
  getSalesData,
  SalesQueryParams,
} from "@services/sales.services/read.service";
import { createSale } from "@services/sales.services/create_bulk.service";
import {
  CreateSalesReturnRequest,
  createSalesReturnService,
} from "@services/sales.services/create_sales_return.service";
import {
  UpdateSalesReturnStatusRequest,
  updateSalesReturnStatusService,
} from "@services/sales.services/update_sales_return_status.service";
import { parseISO, isValid, formatDate } from "date-fns";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

export const create = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const result = await createSale(req.body, {
      userId,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    successHandler(result, res, "POST", "Sale created successfully");
  }
);

export const read = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    try {
      const responseData = await getSalesData(req.query as SalesQueryParams);
      successHandler(responseData, res, "GET", "Sales fetched successfully");
    } catch (error) {
      console.error("Error fetching sales:", error);
      throw new Error("Failed to fetch sales data");
    }
  }
);

export const createSalesReturn = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const {
      originalSaleId,
      returnQuantity,
      returnReason,
      notes,
      restockable = true,
    }: CreateSalesReturnRequest = req.body;

    const userId = req.user?.id;
    if (typeof userId !== "number") {
      throw new Error("User not authenticated");
    }

    try {
      const result = await createSalesReturnService({
        originalSaleId,
        returnQuantity,
        returnReason,
        notes,
        restockable,
        userId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      successHandler(result, res, "POST", "Sales Return Created Successfully");
    } catch (error: any) {
      throw new Error(error); // Let expressAsyncHandler handle the error
    }
  }
);

export const read_SalesReturn = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortField = "createdAt",
      sortOrder = "desc",
      status,
      dateFrom,
      dateTo,
      processedById,
      approvedById,
      returnReason,
      restockable,
    } = req.query;

    // Convert page and limit to numbers
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build search conditions for searchable fields
    const searchConditions = search
      ? {
          OR: [
            { transactionID: { contains: search as string } }, // ← was referenceNumber
            { returnReason: { contains: search as string } },
            { notes: { contains: search as string } },
            {
              originalSale: {
                OR: [
                  { transactionID: { contains: search as string } }, // ← was referenceNumber
                  { genericName: { contains: search as string } },
                  { brandName: { contains: search as string } },
                  { companyName: { contains: search as string } },
                  { customerName: { contains: search as string } },
                  { classification: { contains: search as string } },
                  { batchNumber: { contains: search as string } },
                  { supplierName: { contains: search as string } },
                ],
              },
            },
          ],
        }
      : {};

    // Build filter conditions
    const filterConditions: any = {};

    // Status filter
    if (status) {
      filterConditions.status = status;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filterConditions.returnDate = {};
      if (dateFrom) {
        filterConditions.returnDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        filterConditions.returnDate.lte = new Date(dateTo as string);
      }
    }

    // User filters
    if (processedById) {
      filterConditions.processedById = parseInt(processedById as string, 10);
    }

    if (approvedById) {
      filterConditions.approvedById = parseInt(approvedById as string, 10);
    }

    // Return reason filter
    if (returnReason) {
      filterConditions.returnReason = {
        contains: returnReason as string,
      };
    }

    // Restockable filter
    if (restockable !== undefined) {
      filterConditions.restockable = restockable === "true";
    }

    // Combine all conditions
    const whereConditions = {
      ...searchConditions,
      ...filterConditions,
    };

    // Build sort conditions
    const orderBy: any = {};
    if (
      sortField === "createdAt" ||
      sortField === "updatedAt" ||
      sortField === "returnDate"
    ) {
      orderBy[sortField as string] = sortOrder as string;
    } else if (
      sortField === "referenceNumber" ||
      sortField === "returnReason" ||
      sortField === "status"
    ) {
      orderBy[sortField as string] = sortOrder as string;
    } else if (
      sortField === "returnQuantity" ||
      sortField === "returnPrice" ||
      sortField === "refundAmount"
    ) {
      orderBy[sortField as string] = sortOrder as string;
    } else {
      // Default sort
      orderBy.createdAt = "desc";
    }

    try {
      // Get total count for pagination
      const totalItems = await prisma.salesReturn.count({
        where: {
          ...searchConditions,
          ...filterConditions,
        },
      });
      // Fetch paginated results with relations
      const salesReturns = await prisma.salesReturn.findMany({
        where: whereConditions,
        include: {
          originalSale: {
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
              customer: true,
              psr: true,
              district: true,
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
        orderBy,
        skip,
        take: limitNum,
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPreviousPage = pageNum > 1;

      const summaryStats = await prisma.salesReturn.aggregate({
        where: {
          ...searchConditions,
          ...filterConditions,
        },
        _sum: {
          refundAmount: true,
          returnQuantity: true,
        },
        _count: {
          id: true,
        },
      });

      // Get status-specific counts
      const statusCounts = await prisma.salesReturn.groupBy({
        by: ["status"],
        where: {
          ...searchConditions,
          ...filterConditions,
        },
        _count: {
          id: true,
        },
      });

      // Get restockable items count
      const restockableCount = await prisma.salesReturn.count({
        where: {
          ...searchConditions,
          ...filterConditions,
          restockable: true,
        },
      });

      // Process status counts into a more usable format
      const statusMap = statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>);

      // Create summary object
      const summary = {
        totalReturns: summaryStats._count.id || 0,
        totalRefunds: summaryStats._sum.refundAmount || 0,
        pendingReturns: statusMap["PENDING"] || 0,
        restockableItems: restockableCount || 0,
        completedReturns:
          (statusMap["APPROVED"] || 0) + (statusMap["COMPLETED"] || 0),
      };

      const response = {
        data: salesReturns,
        summary,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          itemsPerPage: limitNum,
          hasNextPage,
          hasPreviousPage,
        },
        filters: {
          search: search || null,
          status: status || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          processedById: processedById || null,
          approvedById: approvedById || null,
          returnReason: returnReason || null,
          restockable: restockable || null,
        },
        sort: {
          field: sortField,
          order: sortOrder,
        },
      };

      successHandler(
        response,
        res,
        "GET",
        "Sales Returns fetched successfully"
      );
    } catch (error) {
      console.error("Error fetching sales returns:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while fetching sales returns",
      });
    }
  }
);

export const create_update_payment = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Create Update Payment",
      res,
      "POST",
      "Payment Updated Successfully"
    );
  }
);

export const updateSalesReturnStatus = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { salesReturnId, newStatus, notes }: UpdateSalesReturnStatusRequest =
      req.body;

    const userId = req.user?.id;
    if (typeof userId !== "number") {
      throw new Error("User not authenticated");
    }

    try {
      const result = await updateSalesReturnStatusService({
        salesReturnId,
        newStatus,
        notes,
        userId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      successHandler(
        result,
        res,
        "PUT",
        `Sales Return Status Updated to ${newStatus} Successfully`
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to update sales return status");
    }
  }
);

// export const update = expressAsyncHandler(
//   async (req: AuthRequest, res: Response) => {
//     successHandler("Updated Sales", res, "PUT", "Sales updated successfully");
//   }
// );

// // DELETE Sales (Soft delete - set isActive to false)
// export const remove = expressAsyncHandler(
//   async (req: AuthRequest, res: Response) => {
//     successHandler(
//       "Sales Deleted Successfully",
//       res,
//       "DELETE",
//       "Sales deactivated successfully"
//     );
//   }
// );

// // RESTORE Sales (Reactivate soft-deleted Sales)
// export const restore = expressAsyncHandler(
//   async (req: AuthRequest, res: Response) => {
//     successHandler(
//       "Sales Restored Successfully",
//       res,
//       "PUT",
//       "Sales restored successfully"
//     );
//   }
// );

// SALES REPORT MANAGEMENT
export const sales_report = expressAsyncHandler(
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

    // Build where clause for filtering
    const whereClause: any = {
      isActive: true, // Only fetch active sales
      saleDate: {
        gte: fromDate,
        lte: toDate,
      },
    };

    // Fetch sales data within date range with comprehensive includes
    const sales = await prisma.sales.findMany({
      where: whereClause,
      include: {
        customer: true,
        createdBy: { select: { fullname: true } },
        updatedBy: { select: { fullname: true } },
        psr: {
          select: {
            psrCode: true,
            fullName: true,
            areaCode: true,
            status: true,
          },
        },
        district: { select: { name: true, code: true } },
        inventoryItem: {
          include: {
            product: {
              select: {
                generic: { select: { name: true } },
                brand: { select: { name: true } },
                company: { select: { name: true } },
                categories: { select: { name: true } },
              },
            },
            batch: {
              select: {
                supplier: { select: { name: true } },
                district: { select: { name: true } },
              },
            },
          },
        },
        payments: {
          include: {
            receivedBy: { select: { fullname: true } },
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
      orderBy: { saleDate: "asc" },
    });

    // Fetch sales returns within date range
    const salesReturns = await prisma.salesReturn.findMany({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        originalSale: {
          include: {
            customer: true,
            psr: { select: { psrCode: true, fullName: true, areaCode: true } },
            district: { select: { name: true, code: true } },
            inventoryItem: {
              include: {
                product: {
                  select: {
                    generic: { select: { name: true } },
                    brand: { select: { name: true } },
                    company: { select: { name: true } },
                    categories: { select: { name: true } },
                  },
                },
                batch: {
                  select: {
                    supplier: { select: { name: true } },
                    district: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        processedBy: { select: { fullname: true } },
        approvedBy: { select: { fullname: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate gross sales summary (without deducting returns)
    const calculateGrossSalesSummary = (sales: any[]) => {
      const summary = sales.reduce(
        (acc, sale) => {
          // Calculate total revenue: unitFinalPrice is already the total price for this sale
          const revenue = sale.unitFinalPrice;

          // Calculate COGS: quantity * costPrice
          const cogs = sale.inventoryItem?.costPrice
            ? sale.quantity * sale.inventoryItem.costPrice
            : 0;

          acc.totalRevenue += Number(revenue);
          acc.totalCOGS += Number(cogs);
          acc.totalQuantitySold += sale.quantity;
          acc.totalAmountPaid += Number(sale.amountPaid) || 0;
          acc.totalBalance += Number(sale.balance) || 0;

          return acc;
        },
        {
          totalRevenue: 0,
          totalCOGS: 0,
          totalQuantitySold: 0,
          totalAmountPaid: 0,
          totalBalance: 0,
        }
      );

      const totalGrossProfit = summary.totalRevenue - summary.totalCOGS;
      const averageOrderValue =
        sales.length > 0 ? summary.totalRevenue / sales.length : 0;

      return {
        ...summary,
        totalGrossProfit,
        averageOrderValue,
      };
    };

    const salesSummary = calculateGrossSalesSummary(sales);

    // Calculate return metrics with proper accounting
    const totalReturnValue = salesReturns.reduce(
      (sum, returnItem) => sum + Number(returnItem.refundAmount || 0),
      0
    );

    // Calculate return COGS (cost of returned items)
    const totalReturnCOGS = salesReturns.reduce((sum, returnItem) => {
      const costPrice = returnItem.originalSale?.inventoryItem?.costPrice || 0;
      return sum + returnItem.returnQuantity * Number(costPrice);
    }, 0);

    // Calculate net gross profit impact (return revenue - return COGS)
    const returnGrossProfitImpact = totalReturnValue - totalReturnCOGS;

    // Calculate comprehensive summary statistics using the same logic as services
    const summary = {
      // Basic Sales Metrics
      totalSales: sales.length,
      totalSalesItems: salesSummary.totalQuantitySold,
      totalSalesValue: salesSummary.totalRevenue,
      totalCostOfGoodsSold: salesSummary.totalCOGS,
      totalDiscounts: sales.reduce(
        (sum, sale) => sum + Number(sale.unitDiscount || 0),
        0
      ),
      grossProfit: salesSummary.totalGrossProfit,
      averageTransactionValue: salesSummary.averageOrderValue,

      // Payment Metrics
      totalPayments: salesSummary.totalAmountPaid,
      outstandingBalances: salesSummary.totalBalance,

      // Return Metrics - using the same logic as sales returns service
      totalReturns: salesReturns.length,
      totalReturnItems: salesReturns.reduce(
        (sum, returnItem) => sum + returnItem.returnQuantity,
        0
      ),
      totalReturnValue: totalReturnValue,
      totalReturnCOGS: totalReturnCOGS,
      returnGrossProfitImpact: returnGrossProfitImpact,
      // Additional return metrics from sales returns service
      pendingReturns: salesReturns.filter((r) => r.status === "PENDING").length,
      restockableItems: salesReturns.filter((r) => r.restockable).length,
      completedReturns: salesReturns.filter(
        (r) => r.status === "APPROVED" || r.status === "PROCESSED"
      ).length,

      // Net Metrics (after returns) - Proper Accounting
      netSales: salesSummary.totalRevenue - totalReturnValue,
      netCOGS: salesSummary.totalCOGS - totalReturnCOGS,
      netGrossProfit: salesSummary.totalGrossProfit - returnGrossProfitImpact,

      // Date Range
      dateFrom: dateFrom,
      dateTo: dateTo,
    };

    // Calculate detailed breakdowns using the same logic as services
    const calculateBreakdowns = (sales: any[], salesReturns: any[]) => {
      const breakdowns = {
        // Payment Terms Breakdown
        paymentTerms: sales.reduce(
          (acc: Record<string, { count: number; value: number }>, sale) => {
            const term = sale.paymentTerms;
            if (!acc[term]) {
              acc[term] = { count: 0, value: 0 };
            }
            acc[term].count++;
            acc[term].value += Number(sale.unitFinalPrice);
            return acc;
          },
          {}
        ),

        // Payment Methods Breakdown
        paymentMethods: sales.reduce(
          (acc: Record<string, { count: number; value: number }>, sale) => {
            sale.payments.forEach((payment: any) => {
              const method = payment.paymentMethod;
              if (!acc[method]) {
                acc[method] = { count: 0, value: 0 };
              }
              acc[method].count++;
              acc[method].value += Number(payment.paymentAmount);
            });
            return acc;
          },
          {}
        ),

        // Sales Status Breakdown
        salesStatus: sales.reduce(
          (acc: Record<string, { count: number; value: number }>, sale) => {
            const status = sale.status;
            if (!acc[status]) {
              acc[status] = { count: 0, value: 0 };
            }
            acc[status].count++;
            acc[status].value += Number(sale.unitFinalPrice);
            return acc;
          },
          {}
        ),

        // Customer Classification Breakdown
        customerClassification: sales.reduce(
          (acc: Record<string, { count: number; value: number }>, sale) => {
            const classification = sale.classification || "UNCLASSIFIED";
            if (!acc[classification]) {
              acc[classification] = { count: 0, value: 0 };
            }
            acc[classification].count++;
            acc[classification].value += Number(sale.unitFinalPrice);
            return acc;
          },
          {}
        ),

        // District Breakdown
        districtSales: sales.reduce(
          (acc: Record<string, { count: number; value: number }>, sale) => {
            const district = sale.district.name;
            if (!acc[district]) {
              acc[district] = { count: 0, value: 0 };
            }
            acc[district].count++;
            acc[district].value += Number(sale.unitFinalPrice);
            return acc;
          },
          {}
        ),

        // PSR Performance
        psrPerformance: sales.reduce(
          (
            acc: Record<
              string,
              {
                psrCode: string;
                areaCode: string | null;
                count: number;
                value: number;
              }
            >,
            sale
          ) => {
            const psr = sale.psr.fullName;
            if (!acc[psr]) {
              acc[psr] = {
                psrCode: sale.psr.psrCode,
                areaCode: sale.psr.areaCode,
                count: 0,
                value: 0,
              };
            }
            acc[psr].count++;
            acc[psr].value += Number(sale.unitFinalPrice);
            return acc;
          },
          {}
        ),

        // Product Analysis
        topProducts: sales.reduce(
          (
            acc: Record<
              string,
              {
                brandName: string;
                genericName: string;
                companyName: string;
                quantity: number;
                value: number;
              }
            >,
            sale
          ) => {
            const productKey = `${sale.brandName} - ${sale.genericName}`;
            if (!acc[productKey]) {
              acc[productKey] = {
                brandName: sale.brandName,
                genericName: sale.genericName,
                companyName: sale.companyName,
                quantity: 0,
                value: 0,
              };
            }
            acc[productKey].quantity += sale.quantity;
            acc[productKey].value += Number(sale.unitFinalPrice);
            return acc;
          },
          {}
        ),

        // Return Analysis
        returnReasons: salesReturns.reduce(
          (
            acc: Record<string, { count: number; value: number }>,
            returnItem
          ) => {
            const reason = returnItem.returnReason;
            if (!acc[reason]) {
              acc[reason] = { count: 0, value: 0 };
            }
            acc[reason].count++;
            acc[reason].value += Number(returnItem.refundAmount || 0);
            return acc;
          },
          {}
        ),

        // Return Status
        returnStatus: salesReturns.reduce(
          (
            acc: Record<string, { count: number; value: number }>,
            returnItem
          ) => {
            const status = returnItem.status;
            if (!acc[status]) {
              acc[status] = { count: 0, value: 0 };
            }
            acc[status].count++;
            acc[status].value += Number(returnItem.refundAmount || 0);
            return acc;
          },
          {}
        ),
      };

      return breakdowns;
    };

    const breakdowns = calculateBreakdowns(sales, salesReturns);

    // Excel export logic - save to server
    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();

      // Function to get status color
      const getStatusColor = (status: string) => {
        switch (status) {
          case "ACTIVE":
          case "COMPLETED":
            return {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: "FF4CAF50" },
            }; // Green
          case "PENDING":
            return {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: "FFFF9800" },
            }; // Orange
          case "CANCELLED":
          case "REJECTED":
            return {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: "FFFF5722" },
            }; // Red
          case "RETURNED":
          case "PROCESSED":
            return {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: "FF9C27B0" },
            }; // Purple
          default:
            return {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: "FFFFFFFF" },
            }; // White
        }
      };

      // SHEET 1: Sales Report
      const salesWorksheet = workbook.addWorksheet("Sales Report");

      salesWorksheet.columns = [
        { header: "Status", key: "status", width: 30 },
        { header: "Reference #", key: "referenceNumber", width: 23 },
        { header: "Customer", key: "customer", width: 40 },
        { header: "Classification", key: "classification", width: 18 },
        { header: "Sale Date", key: "saleDate", width: 15 },
        { header: "PSR", key: "psr", width: 50 },
        { header: "District", key: "district", width: 20 },
        { header: "Product Brand", key: "productBrand", width: 25 },
        { header: "Product Generic", key: "productGeneric", width: 50 },
        { header: "Product Company", key: "productCompany", width: 40 },
        { header: "Product Categories", key: "productCategories", width: 25 },
        { header: "Batch Number", key: "batchNumber", width: 20 },
        { header: "Supplier", key: "supplier", width: 25 },
        { header: "Expiry Date", key: "expiryDate", width: 15 },
        { header: "Quantity", key: "quantity", width: 12 },
        { header: "Unit Cost Price", key: "unitCostPrice", width: 15 },
        { header: "Unit Retail Price", key: "unitRetailPrice", width: 15 },
        { header: "Unit Discount", key: "unitDiscount", width: 15 },
        { header: "Unit Final Price", key: "unitFinalPrice", width: 15 },
        { header: "Total Amount", key: "totalAmount", width: 15 },
        { header: "Payment Terms", key: "paymentTerms", width: 15 },
        { header: "Payment Method", key: "paymentMethod", width: 15 },
        { header: "Total Paid", key: "totalPaid", width: 15 },
        { header: "Remaining Balance", key: "remainingBalance", width: 15 },
        { header: "Due Date", key: "dueDate", width: 15 },
        { header: "Invoice Number", key: "invoiceNumber", width: 20 },
        { header: "Document Type", key: "documentType", width: 15 },
        { header: "Pullout Date", key: "pulloutDate", width: 15 },
        { header: "Created By", key: "createdBy", width: 25 },
        { header: "Notes", key: "notes", width: 30 },
      ];

      // Add title and date for Sales Report sheet
      salesWorksheet.insertRow(1, ["Sales Report"]);
      salesWorksheet.mergeCells(1, 1, 1, salesWorksheet.columns.length);
      const salesTitleRow = salesWorksheet.getRow(1);
      salesTitleRow.font = { size: 18, bold: true };
      salesTitleRow.alignment = { vertical: "middle", horizontal: "center" };
      salesTitleRow.height = 40;

      const salesDateGenerated = `Date generated: ${new Date().toLocaleString()} | Date Range: ${dateFrom} to ${dateTo}`;
      salesWorksheet.insertRow(2, [salesDateGenerated]);
      salesWorksheet.mergeCells(2, 1, 2, salesWorksheet.columns.length);
      const salesDateRow = salesWorksheet.getRow(2);
      salesDateRow.font = { italic: true, size: 10 };
      salesDateRow.alignment = { vertical: "middle", horizontal: "right" };
      salesDateRow.height = 25;

      // Add data rows for Sales Report
      sales.forEach((sale) => {
        const totalPaid = sale.payments.reduce(
          (sum, payment: any) => sum + Number(payment.paymentAmount),
          0
        );
        const totalAmount = Number(sale.unitFinalPrice);

        const row = salesWorksheet.addRow({
          status: sale.status,
          referenceNumber: sale.transactionID,
          customer: sale.customer?.customerName || sale.customerName || "N/A",
          classification: sale.classification || "N/A",
          saleDate: sale.saleDate,
          psr: `${sale.psr.psrCode} - ${sale.psr.fullName}`,
          district: sale.district.name,
          productBrand: sale.brandName || "N/A",
          productGeneric: sale.genericName || "N/A",
          productCompany: sale.companyName || "N/A",
          productCategories:
            sale.inventoryItem.product.categories
              ?.map((c: any) => c.name)
              .join(", ") || "N/A",
          batchNumber: sale.batchNumber,
          supplier: sale.supplierName,
          expiryDate: sale.expiryDate,
          quantity: sale.quantity,
          unitCostPrice: Number(sale.unitCostPrice).toLocaleString("en-US"),
          unitRetailPrice: Number(sale.unitRetailPrice).toLocaleString("en-US"),
          unitDiscount: Number(sale.unitDiscount).toLocaleString("en-US"),
          unitFinalPrice: Number(sale.unitFinalPrice).toLocaleString("en-US"),
          totalAmount: totalAmount.toLocaleString("en-US"),
          paymentTerms: sale.paymentTerms,
          paymentMethod: sale.paymentMethod,
          totalPaid: totalPaid.toLocaleString("en-US"),
          remainingBalance: Number(sale.balance).toLocaleString("en-US"),
          dueDate: sale.dueDate || "N/A",
          invoiceNumber: sale.invoiceNumber || "N/A",
          documentType: sale.documentType || "N/A",
          pulloutDate: sale.pulloutDate || "N/A",
          createdBy: sale.createdBy?.fullname || "N/A",
          notes: sale.notes || "N/A",
        });

        // Apply color coding to status cell
        const statusCell = row.getCell(1);
        statusCell.fill = getStatusColor(sale.status);
        statusCell.font = { bold: true, color: { argb: "FF000000" } };
      });

      // Style Sales Report sheet
      salesWorksheet.eachRow((row, rowNumber) => {
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
      salesWorksheet.getRow(3).font = { bold: true };

      // Add comprehensive summary for Sales Report
      let lastSalesRow = salesWorksheet.lastRow
        ? salesWorksheet.lastRow.number
        : salesWorksheet.rowCount;
      salesWorksheet.addRow([]);
      salesWorksheet.addRow([
        `Total Sales:`,
        summary.totalSales.toLocaleString("en-US"),
      ]);
      salesWorksheet.addRow([
        `Total Sales Items:`,
        summary.totalSalesItems.toLocaleString("en-US"),
      ]);
      salesWorksheet.addRow([
        `Total Sales Value:`,
        `₱${summary.totalSalesValue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);
      salesWorksheet.addRow([
        `Total Discounts:`,
        `₱${summary.totalDiscounts.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);

      salesWorksheet.addRow([
        `Total Payments:`,
        `₱${summary.totalPayments.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);
      salesWorksheet.addRow([
        `Outstanding Balances:`,
        `₱${summary.outstandingBalances.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);

      for (let i = lastSalesRow + 2; i <= lastSalesRow + 12; i++) {
        const summaryRow = salesWorksheet.getRow(i);
        summaryRow.font = { bold: true };
        summaryRow.alignment = { vertical: "middle", horizontal: "center" };
      }

      // SHEET 2: Sales Returns Report
      const returnsWorksheet = workbook.addWorksheet("Sales Returns");

      returnsWorksheet.columns = [
        { header: "Status", key: "status", width: 35 },
        { header: "Return Date", key: "returnDate", width: 20 },
        { header: "Original Sale Ref", key: "originalSaleRef", width: 25 },
        { header: "Customer", key: "customer", width: 50 },
        { header: "PSR", key: "psr", width: 30 },
        { header: "District", key: "district", width: 20 },
        { header: "Product Brand", key: "productBrand", width: 20 },
        { header: "Product Generic", key: "productGeneric", width: 50 },
        { header: "Product Company", key: "productCompany", width: 25 },
        { header: "Batch Number", key: "batchNumber", width: 20 },
        { header: "Supplier", key: "supplier", width: 25 },
        { header: "Return Quantity", key: "returnQuantity", width: 15 },
        { header: "Return Price", key: "returnPrice", width: 15 },
        { header: "Return Amount", key: "returnAmount", width: 15 },
        { header: "Return Reason", key: "returnReason", width: 30 },
        { header: "Restockable", key: "restockable", width: 12 },
        { header: "Processed By", key: "processedBy", width: 30 },
        { header: "Approved By", key: "approvedBy", width: 30 },
        { header: "Notes", key: "notes", width: 30 },
      ];

      // Add title and date for Sales Returns sheet
      returnsWorksheet.insertRow(1, ["Sales Returns Report"]);
      returnsWorksheet.mergeCells(1, 1, 1, returnsWorksheet.columns.length);
      returnsWorksheet.getRow(1).font = { size: 18, bold: true };
      returnsWorksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      const returnsDateInfo = `Date generated: ${new Date().toLocaleString()} | Date Range: ${dateFrom} to ${dateTo}`;
      returnsWorksheet.insertRow(2, [returnsDateInfo]);
      returnsWorksheet.mergeCells(2, 1, 2, returnsWorksheet.columns.length);
      returnsWorksheet.getRow(2).font = { italic: true, size: 10 };
      returnsWorksheet.getRow(2).alignment = {
        vertical: "middle",
        horizontal: "right",
      };

      // Add data rows for Sales Returns
      salesReturns.forEach((returnItem) => {
        const row = returnsWorksheet.addRow({
          status: returnItem.status,
          returnDate: returnItem.returnDate,
          originalSaleRef: returnItem.originalSale.transactionID,
          customer:
            returnItem.originalSale.customer?.customerName ||
            returnItem.originalSale.customerName ||
            "N/A",
          psr: `${returnItem.originalSale.psr.psrCode} - ${returnItem.originalSale.psr.fullName}`,
          district: returnItem.originalSale.district.name,
          productBrand: returnItem.originalSale.brandName || "N/A",
          productGeneric: returnItem.originalSale.genericName || "N/A",
          productCompany: returnItem.originalSale.companyName || "N/A",
          batchNumber: returnItem.originalSale.batchNumber,
          supplier: returnItem.originalSale.supplierName,
          returnQuantity: returnItem.returnQuantity,
          returnPrice: Number(returnItem.returnPrice).toLocaleString("en-US"),
          returnAmount: Number(returnItem.refundAmount || 0).toLocaleString(
            "en-US"
          ),
          returnReason: returnItem.returnReason,
          restockable: returnItem.restockable ? "Yes" : "No",
          processedBy: returnItem.processedBy?.fullname || "N/A",
          approvedBy: returnItem.approvedBy?.fullname || "N/A",
          notes: returnItem.notes || "N/A",
        });

        // Apply color coding to status cell
        const statusCell = row.getCell(1);
        statusCell.fill = getStatusColor(returnItem.status);
        statusCell.font = { bold: true, color: { argb: "FF000000" } };
      });

      // Style Sales Returns sheet
      returnsWorksheet.eachRow((row, rowNumber) => {
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
      returnsWorksheet.getRow(3).font = { bold: true };

      // Add comprehensive summary for Sales Returns
      let lastReturnsRow = returnsWorksheet.lastRow
        ? returnsWorksheet.lastRow.number
        : returnsWorksheet.rowCount;
      returnsWorksheet.addRow([]);
      returnsWorksheet.addRow([
        `Total Returns:`,
        summary.totalReturns.toLocaleString("en-US"),
      ]);
      returnsWorksheet.addRow([
        `Total Return Items:`,
        summary.totalReturnItems.toLocaleString("en-US"),
      ]);
      returnsWorksheet.addRow([
        `Total Return Value:`,
        `₱${summary.totalReturnValue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);
      returnsWorksheet.addRow([
        `Pending Returns:`,
        summary.pendingReturns.toLocaleString("en-US"),
      ]);
      returnsWorksheet.addRow([
        `Completed Returns:`,
        summary.completedReturns.toLocaleString("en-US"),
      ]);
      returnsWorksheet.addRow([
        `Restockable Items:`,
        summary.restockableItems.toLocaleString("en-US"),
      ]);

      const returnsSummaryRow = returnsWorksheet.getRow(lastReturnsRow + 2);
      returnsSummaryRow.font = { bold: true };
      returnsSummaryRow.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // Style the additional summary rows
      for (let i = lastReturnsRow + 3; i <= lastReturnsRow + 10; i++) {
        const summaryRow = returnsWorksheet.getRow(i);
        summaryRow.font = { bold: true };
        summaryRow.alignment = { vertical: "middle", horizontal: "center" };
      }

      // SHEET 3: Summary Analysis
      const summaryWorksheet = workbook.addWorksheet("Summary Analysis");

      // Set column widths for better readability
      summaryWorksheet.columns = [
        { header: "Metric", key: "metric", width: 50 },
        { header: "Value", key: "value", width: 50 },
        { header: "Percentage", key: "percentage", width: 40 },
        { header: "Count", key: "count", width: 30 },
        { header: "PSR Code", key: "psrCode", width: 30 },
        { header: "Area Code", key: "areaCode", width: 30 },
        { header: "Company", key: "company", width: 30 },
        { header: "Quantity", key: "quantity", width: 30 },
        { header: "Return Reason", key: "returnReason", width: 30 },
      ];

      // Add title
      summaryWorksheet.insertRow(1, ["Sales Summary Analysis"]);
      summaryWorksheet.mergeCells(1, 1, 1, 9);
      summaryWorksheet.getRow(1).font = { size: 18, bold: true };
      summaryWorksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      summaryWorksheet.getRow(1).height = 40;

      // Financial Summary with Before & After Returns Analysis
      summaryWorksheet.addRow([]);
      summaryWorksheet.addRow([
        "FINANCIAL SUMMARY (Before & After Returns Analysis)",
      ]);
      summaryWorksheet.mergeCells(3, 1, 3, 9);
      summaryWorksheet.getRow(3).font = { bold: true, size: 14 };
      summaryWorksheet.getRow(3).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      summaryWorksheet.getRow(3).height = 30;

      summaryWorksheet.addRow([
        "Metric",
        "Before Returns",
        "Returns Impact",
        "After Returns",
        "% Change",
      ]);
      summaryWorksheet.getRow(4).font = { bold: true };
      summaryWorksheet.getRow(4).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // Sales Count Analysis
      summaryWorksheet.addRow([
        "Sales Count",
        summary.totalSales.toLocaleString("en-US"),
        `-${summary.totalReturns.toLocaleString("en-US")}`,
        (summary.totalSales - summary.totalReturns).toLocaleString("en-US"),
        `${
          summary.totalSales > 0
            ? ((-summary.totalReturns / summary.totalSales) * 100).toFixed(2)
            : 0
        }%`,
      ]);

      // Items/Quantity Analysis
      summaryWorksheet.addRow([
        "Items Sold",
        summary.totalSalesItems.toLocaleString("en-US"),
        `-${summary.totalReturnItems.toLocaleString("en-US")}`,
        (summary.totalSalesItems - summary.totalReturnItems).toLocaleString(
          "en-US"
        ),
        `${
          summary.totalSalesItems > 0
            ? (
                (-summary.totalReturnItems / summary.totalSalesItems) *
                100
              ).toFixed(2)
            : 0
        }%`,
      ]);

      // Sales Value Analysis
      summaryWorksheet.addRow([
        "Sales Value",
        `₱${summary.totalSalesValue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `-₱${summary.totalReturnValue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `₱${summary.netSales.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `${
          summary.totalSalesValue > 0
            ? (
                ((summary.netSales - summary.totalSalesValue) /
                  summary.totalSalesValue) *
                100
              ).toFixed(2)
            : 0
        }%`,
      ]);

      // Cost of Goods Sold Analysis
      summaryWorksheet.addRow([
        "Cost of Goods Sold",
        `₱${summary.totalCostOfGoodsSold.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `-₱${summary.totalReturnCOGS.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `₱${summary.netCOGS.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `${
          summary.totalCostOfGoodsSold > 0
            ? (
                ((summary.netCOGS - summary.totalCostOfGoodsSold) /
                  summary.totalCostOfGoodsSold) *
                100
              ).toFixed(2)
            : 0
        }%`,
      ]);

      // Gross Profit Analysis (Revenue - COGS)
      summaryWorksheet.addRow([
        "Gross Profit",
        `₱${summary.grossProfit.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `-₱${summary.returnGrossProfitImpact.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `₱${summary.netGrossProfit.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `${
          summary.grossProfit > 0
            ? (
                ((summary.netGrossProfit - summary.grossProfit) /
                  summary.grossProfit) *
                100
              ).toFixed(2)
            : 0
        }%`,
      ]);

      // Payment Analysis
      summaryWorksheet.addRow([
        "Total Payments",
        `₱${summary.totalPayments.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        "Impact Varies",
        `₱${summary.totalPayments.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        "See Details",
      ]);

      // Outstanding Balance Analysis
      summaryWorksheet.addRow([
        "Outstanding Balance",
        `₱${summary.outstandingBalances.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `-₱${summary.totalReturnValue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `₱${(
          summary.outstandingBalances - summary.totalReturnValue
        ).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `${
          summary.outstandingBalances > 0
            ? (
                (-summary.totalReturnValue / summary.outstandingBalances) *
                100
              ).toFixed(2)
            : 0
        }%`,
      ]);

      // Add a separator row
      summaryWorksheet.addRow([]);

      // Add Return Impact Summary Section with Proper Accounting
      summaryWorksheet.addRow([
        "RETURN IMPACT ANALYSIS (Accounting Breakdown)",
        "",
        "",
        "",
        "",
      ]);
      summaryWorksheet.getRow(summaryWorksheet.rowCount).font = {
        bold: true,
        size: 12,
      };
      summaryWorksheet.getRow(summaryWorksheet.rowCount).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFEAA7" }, // Light yellow background
      };

      summaryWorksheet.addRow([
        "Return Transactions",
        summary.totalReturns.toLocaleString("en-US"),
        "",
        "",
        `${
          summary.totalSales > 0
            ? ((summary.totalReturns / summary.totalSales) * 100).toFixed(2)
            : 0
        }% of Sales`,
      ]);

      summaryWorksheet.addRow([
        "Return Revenue Impact",
        `₱${summary.totalReturnValue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        "",
        "",
        `${
          summary.totalSalesValue > 0
            ? (
                (summary.totalReturnValue / summary.totalSalesValue) *
                100
              ).toFixed(2)
            : 0
        }% of Revenue`,
      ]);

      summaryWorksheet.addRow([
        "Return COGS Savings",
        `₱${summary.totalReturnCOGS.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        "",
        "",
        `${
          summary.totalCostOfGoodsSold > 0
            ? (
                (summary.totalReturnCOGS / summary.totalCostOfGoodsSold) *
                100
              ).toFixed(2)
            : 0
        }% of COGS`,
      ]);

      summaryWorksheet.addRow([
        "Net Gross Profit Impact",
        `₱${summary.returnGrossProfitImpact.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        "",
        "",
        `${
          summary.grossProfit > 0
            ? (
                (summary.returnGrossProfitImpact / summary.grossProfit) *
                100
              ).toFixed(2)
            : 0
        }% of Gross Profit`,
      ]);

      // Payment Terms Breakdown
      summaryWorksheet.addRow([]);
      summaryWorksheet.addRow(["PAYMENT TERMS BREAKDOWN"]);
      const paymentTermsHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.mergeCells(
        paymentTermsHeaderRow,
        1,
        paymentTermsHeaderRow,
        9
      );
      summaryWorksheet.getRow(paymentTermsHeaderRow).font = {
        bold: true,
        size: 14,
      };
      summaryWorksheet.getRow(paymentTermsHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      summaryWorksheet.getRow(paymentTermsHeaderRow).height = 30;

      summaryWorksheet.addRow([
        "Payment Terms",
        "Count",
        "Value",
        "Percentage",
      ]);
      const paymentTermsSubHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.getRow(paymentTermsSubHeaderRow).font = { bold: true };
      summaryWorksheet.getRow(paymentTermsSubHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      Object.entries(breakdowns.paymentTerms).forEach(([term, data]) => {
        summaryWorksheet.addRow([
          term,
          data.count,
          `₱${data.value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          `${
            summary.totalSalesValue > 0
              ? ((data.value / summary.totalSalesValue) * 100).toFixed(2)
              : 0
          }%`,
        ]);
      });

      // Customer Classification Breakdown
      summaryWorksheet.addRow([]);
      summaryWorksheet.addRow(["CUSTOMER CLASSIFICATION BREAKDOWN"]);
      const customerClassHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.mergeCells(
        customerClassHeaderRow,
        1,
        customerClassHeaderRow,
        9
      );
      summaryWorksheet.getRow(customerClassHeaderRow).font = {
        bold: true,
        size: 14,
      };
      summaryWorksheet.getRow(customerClassHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      summaryWorksheet.getRow(customerClassHeaderRow).height = 30;

      summaryWorksheet.addRow([
        "Classification",
        "Count",
        "Value",
        "Percentage",
      ]);
      const customerClassSubHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.getRow(customerClassSubHeaderRow).font = { bold: true };
      summaryWorksheet.getRow(customerClassSubHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      Object.entries(breakdowns.customerClassification).forEach(
        ([classification, data]) => {
          summaryWorksheet.addRow([
            classification,
            data.count,
            `₱${data.value.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            `${
              summary.totalSalesValue > 0
                ? ((data.value / summary.totalSalesValue) * 100).toFixed(2)
                : 0
            }%`,
          ]);
        }
      );

      // District Breakdown
      summaryWorksheet.addRow([]);
      summaryWorksheet.addRow(["DISTRICT BREAKDOWN"]);
      const districtHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.mergeCells(districtHeaderRow, 1, districtHeaderRow, 9);
      summaryWorksheet.getRow(districtHeaderRow).font = {
        bold: true,
        size: 14,
      };
      summaryWorksheet.getRow(districtHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      summaryWorksheet.getRow(districtHeaderRow).height = 30;

      summaryWorksheet.addRow(["District", "Count", "Value", "Percentage"]);
      const districtSubHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.getRow(districtSubHeaderRow).font = { bold: true };
      summaryWorksheet.getRow(districtSubHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      Object.entries(breakdowns.districtSales).forEach(([district, data]) => {
        summaryWorksheet.addRow([
          district,
          data.count,
          `₱${data.value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          `${
            summary.totalSalesValue > 0
              ? ((data.value / summary.totalSalesValue) * 100).toFixed(2)
              : 0
          }%`,
        ]);
      });

      // PSR Performance
      summaryWorksheet.addRow([]);
      summaryWorksheet.addRow(["PSR PERFORMANCE"]);
      const psrHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.mergeCells(psrHeaderRow, 1, psrHeaderRow, 9);
      summaryWorksheet.getRow(psrHeaderRow).font = {
        bold: true,
        size: 14,
      };
      summaryWorksheet.getRow(psrHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      summaryWorksheet.getRow(psrHeaderRow).height = 30;

      summaryWorksheet.addRow([
        "PSR",
        "PSR Code",
        "Area Code",
        "Count",
        "Value",
        "Percentage",
      ]);
      const psrSubHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.getRow(psrSubHeaderRow).font = { bold: true };
      summaryWorksheet.getRow(psrSubHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      Object.entries(breakdowns.psrPerformance).forEach(([psrName, data]) => {
        summaryWorksheet.addRow([
          psrName,
          data.psrCode,
          data.areaCode || "N/A",
          data.count,
          `₱${data.value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          `${
            summary.totalSalesValue > 0
              ? ((data.value / summary.totalSalesValue) * 100).toFixed(2)
              : 0
          }%`,
        ]);
      });

      // Top Products
      summaryWorksheet.addRow([]);
      summaryWorksheet.addRow(["TOP PRODUCTS"]);
      const productsHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.mergeCells(productsHeaderRow, 1, productsHeaderRow, 9);
      summaryWorksheet.getRow(productsHeaderRow).font = {
        bold: true,
        size: 14,
      };
      summaryWorksheet.getRow(productsHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      summaryWorksheet.getRow(productsHeaderRow).height = 30;

      summaryWorksheet.addRow([
        "Product",
        "Company",
        "Quantity",
        "Value",
        "Percentage",
      ]);
      const productsSubHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.getRow(productsSubHeaderRow).font = { bold: true };
      summaryWorksheet.getRow(productsSubHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      const sortedProducts = Object.entries(breakdowns.topProducts)
        .sort(([, a], [, b]) => b.value - a.value)
        .slice(0, 20); // Top 20 products

      sortedProducts.forEach(([productKey, data]) => {
        summaryWorksheet.addRow([
          productKey,
          data.companyName,
          data.quantity,
          `₱${data.value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          `${
            summary.totalSalesValue > 0
              ? ((data.value / summary.totalSalesValue) * 100).toFixed(2)
              : 0
          }%`,
        ]);
      });

      // Return Analysis
      summaryWorksheet.addRow([]);
      summaryWorksheet.addRow(["RETURN ANALYSIS"]);
      const returnAnalysisHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.mergeCells(
        returnAnalysisHeaderRow,
        1,
        returnAnalysisHeaderRow,
        9
      );
      summaryWorksheet.getRow(returnAnalysisHeaderRow).font = {
        bold: true,
        size: 14,
      };
      summaryWorksheet.getRow(returnAnalysisHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      summaryWorksheet.getRow(returnAnalysisHeaderRow).height = 30;

      summaryWorksheet.addRow([
        "Return Reason",
        "Count",
        "Value",
        "Percentage",
      ]);
      const returnAnalysisSubHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.getRow(returnAnalysisSubHeaderRow).font = { bold: true };
      summaryWorksheet.getRow(returnAnalysisSubHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      Object.entries(breakdowns.returnReasons).forEach(([reason, data]) => {
        summaryWorksheet.addRow([
          reason,
          data.count,
          `₱${data.value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          `${
            summary.totalReturnValue > 0
              ? ((data.value / summary.totalReturnValue) * 100).toFixed(2)
              : 0
          }%`,
        ]);
      });

      // Return Status Breakdown
      summaryWorksheet.addRow([]);
      summaryWorksheet.addRow(["RETURN STATUS BREAKDOWN"]);
      const returnStatusHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.mergeCells(
        returnStatusHeaderRow,
        1,
        returnStatusHeaderRow,
        9
      );
      summaryWorksheet.getRow(returnStatusHeaderRow).font = {
        bold: true,
        size: 14,
      };
      summaryWorksheet.getRow(returnStatusHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      summaryWorksheet.getRow(returnStatusHeaderRow).height = 30;

      summaryWorksheet.addRow([
        "Return Status",
        "Count",
        "Value",
        "Percentage",
      ]);
      const returnStatusSubHeaderRow = summaryWorksheet.rowCount;
      summaryWorksheet.getRow(returnStatusSubHeaderRow).font = { bold: true };
      summaryWorksheet.getRow(returnStatusSubHeaderRow).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      Object.entries(breakdowns.returnStatus).forEach(([status, data]) => {
        summaryWorksheet.addRow([
          status,
          data.count,
          `₱${data.value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          `${
            summary.totalReturnValue > 0
              ? ((data.value / summary.totalReturnValue) * 100).toFixed(2)
              : 0
          }%`,
        ]);
      });

      // Style Summary Analysis sheet with borders
      summaryWorksheet.eachRow((row, rowNumber) => {
        // Add borders to all cells in data rows (skip title and section headers)
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        }

        // Center align all cells
        row.alignment = { vertical: "middle", horizontal: "center" };
      });

      // Save the workbook
      const reportsDir = path.join(process.cwd(), "public/reports/sales");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const dateFromFormatted = formatDate(from, "yyyy-MM-dd");
      const dateToFormatted = formatDate(to, "yyyy-MM-dd");
      const filename = `Sales_Report_(${dateFromFormatted}_to_${dateToFormatted}).xlsx`;
      const filePath = path.join(reportsDir, filename);

      if (fs.existsSync(filePath)) {
        throw new Error(
          `A sales report for the date range ${dateFromFormatted} to ${dateToFormatted} already exists. Please delete the existing file first or use a different date range.`
        );
      }

      try {
        await workbook.xlsx.writeFile(filePath);
      } catch (err) {
        console.error("Failed to write Excel file:", err);
        throw new Error("Failed to save Excel report on server");
      }

      const downloadUrl = `/api/v1/sales/report/download/${filename}`;
      successHandler(
        { message: "Excel report generated", url: downloadUrl },
        res,
        "GET",
        "Sales report generated and saved successfully"
      );
      return;
    }

    successHandler(
      {
        summary,
        breakdowns,
        sales,
        salesReturns,
      },
      res,
      "GET",
      "Sales report generated successfully"
    );
  }
);

export const getSalesReportFiles = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    try {
      // Define the reports directory path
      const reportsDir = path.join(process.cwd(), "public/reports/sales");

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
            downloadUrl: `/api/v1/sales/report/download/${file}`,
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
        "Sales report files retrieved successfully"
      );
    } catch (error: any) {
      throw new Error(`Failed to read report files: ${error.message}`);
    }
  }
);

export const downloadAndDeleteSalesReport = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    try {
      const { filename } = req.params;

      // Validate filename to prevent directory traversal attacks
      if (!filename || !filename.endsWith(".xlsx")) {
        throw new Error("Invalid filename");
      }

      // Define the reports directory path
      const reportsDir = path.join(process.cwd(), "public/reports/sales");
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
