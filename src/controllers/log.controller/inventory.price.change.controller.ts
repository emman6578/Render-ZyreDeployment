import { PrismaClient } from "@prisma/client";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import {
  analyzePriceTrends,
  assessProfitMarginHealth,
  calculateAverageChangeInterval,
  calculateBatchHealthScore,
  calculatePriceInsights,
  calculatePriceStabilityScore,
  calculatePriceStatistics,
  findBiggestChange,
  findMostActiveMonth,
  generateBatchRecommendations,
  generateRecommendations,
  InventoryPriceStatistics,
} from "./inventory.price.change.functions/inventory.price.change.functions";

const prisma = new PrismaClient();

export const inventory_price_change_history_read = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage as string) || 10;
    const search = (req.query.search as string)?.trim() || "";

    // Build a where clause for full-text search on the InventoryItem→Product
    const whereClause: any = search
      ? {
          OR: [
            {
              inventoryItem: {
                product: { generic: { name: { contains: search } } },
              },
            },
            {
              inventoryItem: {
                product: { brand: { name: { contains: search } } },
              },
            },
            {
              inventoryItem: {
                batch: { batchNumber: { contains: search } },
              },
            },
            {
              inventoryItem: {
                batch: { referenceNumber: { contains: search } },
              },
            },
            {
              inventoryItem: {
                product: {
                  categories: {
                    some: { name: { contains: search } },
                  },
                },
              },
            },
          ],
        }
      : {};

    // Fetch matching history entries, newest first
    const allHistory = await prisma.inventoryPriceChangeHistory.findMany({
      where: whereClause,
      orderBy: { effectiveDate: "desc" },
      include: {
        inventoryItem: {
          select: {
            id: true,
            batch: {
              select: { id: true, batchNumber: true, referenceNumber: true },
            },
            product: {
              select: {
                id: true,
                generic: { select: { name: true } },
                brand: { select: { name: true } },
                categories: { select: { name: true } },
              },
            },
          },
        },
        createdBy: { select: { id: true, fullname: true } },
      },
    });

    // Group by batch number
    const groupedByBatch = allHistory.reduce((acc, item) => {
      const batchNumber = item.inventoryItem.batch.batchNumber;
      const refNum = item.inventoryItem.batch.referenceNumber;

      if (!acc[batchNumber]) {
        acc[batchNumber] = [];
      }

      acc[batchNumber].push(item);
      return acc;
    }, {} as Record<string, typeof allHistory>);

    // Transform grouped data to show only the latest entry per batch
    const transformedData = Object.entries(groupedByBatch).map(
      ([batchNumber, historyItems]) => {
        // Sort by effectiveDate desc to get the latest entry first
        const sortedItems = historyItems.sort(
          (a, b) =>
            new Date(b.effectiveDate).getTime() -
            new Date(a.effectiveDate).getTime()
        );

        const latestItem = sortedItems[0];

        return {
          id: latestItem.id,
          inventoryItemId: latestItem.inventoryItem.id,
          batchId: latestItem.inventoryItem.batch.id,
          batchNumber: batchNumber,
          referenceNumber: latestItem.inventoryItem.batch.referenceNumber,

          // Product info
          productId: latestItem.inventoryItem.product.id,
          genericName: latestItem.inventoryItem.product.generic?.name ?? null,
          brandName: latestItem.inventoryItem.product.brand?.name ?? null,
          categories:
            latestItem.inventoryItem.product.categories?.map(
              (cat) => cat.name
            ) ?? [],

          // Price change info
          previousCostPrice: latestItem.previousCostPrice
            ? Number(latestItem.previousCostPrice)
            : 0,
          previousRetailPrice: latestItem.previousRetailPrice
            ? Number(latestItem.previousRetailPrice)
            : 0,
          latestCostPrice: Number(latestItem.averageCostPrice),
          latestRetailPrice: Number(latestItem.averageRetailPrice),
          effectiveDate: latestItem.effectiveDate,
          reason: latestItem.reason,
          createdById: latestItem.createdBy.id,
          createdBy: latestItem.createdBy.fullname,
        };
      }
    );

    // Sort the transformed data by latest effective date (newest first)
    const sortedTransformedData = transformedData.sort(
      (a, b) =>
        new Date(b.effectiveDate).getTime() -
        new Date(a.effectiveDate).getTime()
    );

    // Paginate the grouped results
    const totalItems = sortedTransformedData.length;
    const skip = (page - 1) * itemsPerPage;
    const paginatedData = sortedTransformedData.slice(
      skip,
      skip + itemsPerPage
    );

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationMeta = {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    successHandler(
      {
        pagination: paginationMeta,
        data: paginatedData,
      },
      res,
      "GET",
      "Inventory Price Change Log (grouped by batch) fetched successfully"
    );
  }
);

export const inventory_price_change_history_summary = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const batchNumber = req.params.batchNumber;

    if (!batchNumber) {
      throw new Error("Valid batch number is required");
    }

    // First, find the batch using a non-unique query
    const batch = await prisma.inventoryBatch.findFirst({
      where: { batchNumber },
      select: {
        id: true,
        batchNumber: true,
        referenceNumber: true,
        invoiceDate: true,
        expiryDate: true,
        supplier: { select: { name: true } },
        district: { select: { name: true } },
      },
    });

    if (!batch) {
      throw new Error("Batch not found");
    }

    // Get all price changes for items in this batch with full product details
    const priceChanges = await prisma.inventoryPriceChangeHistory.findMany({
      where: {
        inventoryItem: {
          batchId: batch.id,
        },
      },
      orderBy: { effectiveDate: "desc" },
      include: {
        inventoryItem: {
          select: {
            id: true,
            costPrice: true,
            retailPrice: true,
            product: {
              select: {
                id: true,
                averageCostPrice: true,
                averageRetailPrice: true,
                generic: { select: { name: true } },
                brand: { select: { name: true } },
                company: { select: { name: true } },
              },
            },
            batch: { select: { batchNumber: true } },
          },
        },
        createdBy: { select: { fullname: true } },
      },
    });

    if (!priceChanges.length) {
      successHandler(
        {
          batchInfo: {
            batchNumber: batch.batchNumber,
            referenceNumber: batch.referenceNumber,
            invoiceDate: batch.invoiceDate,
            expiryDate: batch.expiryDate,
            supplier: batch.supplier.name,
            district: batch.district.name,
            message: "No price changes recorded for this batch",
          },
        },
        res,
        "GET",
        "Inventory price insights fetched successfully"
      );
      return;
    }

    // Group price changes by product for better analysis
    const groupedByProduct = priceChanges.reduce((acc, change) => {
      const productId = change.inventoryItem.product.id;
      if (!acc[productId]) {
        acc[productId] = {
          product: change.inventoryItem.product,
          inventoryItem: change.inventoryItem,
          history: [],
        };
      }
      acc[productId].history.push(change);
      return acc;
    }, {} as Record<string, any>);

    // Calculate analytics for each product
    const productAnalytics = Object.values(groupedByProduct).map(
      (group: any) => {
        const { product, inventoryItem, history } = group;

        // Calculate insights using the helper functions
        const insights = calculatePriceInsights(history);
        const statistics = calculatePriceStatistics(history, product);
        const trends = analyzePriceTrends(history);

        // Find significant changes
        const biggestIncrease = findBiggestChange(insights, "increase");
        const biggestDecrease = findBiggestChange(insights, "decrease");
        const mostActiveMonth = findMostActiveMonth(history);

        return {
          product: {
            id: product.id,
            generic: product.generic.name,
            brand: product.brand.name,
            company: product.company.name,
            categories: product.categories?.map((cat: any) => cat.name) ?? [],
          },
          inventoryItem: {
            id: inventoryItem.id,
            currentCostPrice: parseFloat(inventoryItem.costPrice.toString()),
            currentRetailPrice: parseFloat(
              inventoryItem.retailPrice.toString()
            ),
          },
          priceChangeHistory: history.map((change: any, index: any) => ({
            id: change.id,
            priceChange: {
              costPrice: {
                previous: change.previousCostPrice
                  ? parseFloat(change.previousCostPrice.toString())
                  : 0,
                current: change.averageCostPrice?.toNumber() ?? 0,
                change:
                  (change.averageCostPrice?.toNumber() ?? 0) -
                  (change.previousCostPrice?.toNumber() ?? 0),
                changePercentage:
                  change.previousCostPrice &&
                  change.previousCostPrice.toNumber() !== 0
                    ? Math.round(
                        (((change.averageCostPrice?.toNumber() ?? 0) -
                          (change.previousCostPrice?.toNumber() ?? 0)) /
                          change.previousCostPrice.toNumber()) *
                          100
                      )
                    : 0,
              },
              retailPrice: {
                previous: change.previousRetailPrice
                  ? change.previousRetailPrice.toNumber()
                  : 0,
                current: change.averageRetailPrice?.toNumber() ?? 0,
                change:
                  (change.averageRetailPrice?.toNumber() ?? 0) -
                  (change.previousRetailPrice?.toNumber() ?? 0),
                changePercentage:
                  change.previousRetailPrice &&
                  change.previousRetailPrice.toNumber() !== 0
                    ? Math.round(
                        (((change.averageRetailPrice?.toNumber() ?? 0) -
                          (change.previousRetailPrice?.toNumber() ?? 0)) /
                          change.previousRetailPrice.toNumber()) *
                          100
                      )
                    : 0,
              },
            },
            insights: insights[index], // Individual change insights
            metadata: {
              effectiveDate: change.effectiveDate,
              reason: change.reason,
              updatedBy: change.createdBy.fullname,
            },
          })),
          analytics: {
            statistics,
            trends,
            significantChanges: {
              biggestIncrease,
              biggestDecrease,
              mostActiveMonth,
            },
            summary: {
              totalChanges: history.length,
              averageChangeInterval: calculateAverageChangeInterval(history),
              priceStabilityScore: calculatePriceStabilityScore(statistics),
              profitMarginHealth: assessProfitMarginHealth(
                statistics.profitMargin.current
              ),
            },
          },
          recommendations: generateRecommendations(statistics, trends, {
            totalChanges: history.length,
          }),
        };
      }
    );

    // Calculate batch-level analytics
    const batchSummary = {
      totalProducts: Object.keys(groupedByProduct).length,
      totalPriceChanges: priceChanges.length,
      averageChangesPerProduct:
        Math.round(
          (priceChanges.length / Object.keys(groupedByProduct).length) * 100
        ) / 100,
      dateRange: {
        firstChange: priceChanges[priceChanges.length - 1]?.effectiveDate,
        lastChange: priceChanges[0]?.effectiveDate,
      },
      batchHealthScore: calculateBatchHealthScore(productAnalytics),
    };

    // Prepare final response
    const analysisData = {
      batchInfo: {
        batchNumber: batch.batchNumber,
        referenceNumber: batch.referenceNumber,
        invoiceDate: batch.invoiceDate,
        expiryDate: batch.expiryDate,
        supplier: batch.supplier.name,
        district: batch.district.name,
        ...batchSummary,
      },
      productAnalytics,
      batchRecommendations: generateBatchRecommendations(
        batchSummary,
        productAnalytics
      ),
      generatedAt: new Date().toISOString(),
    };

    successHandler(
      analysisData,
      res,
      "GET",
      "Comprehensive inventory price analysis completed successfully"
    );
  }
);
