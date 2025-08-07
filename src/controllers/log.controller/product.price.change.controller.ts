import { PrismaClient } from "@prisma/client";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import {
  analyzePriceTrends,
  calculateAverageChangeInterval,
  calculateChangeFrequency,
  calculatePriceInsights,
  calculatePriceStatistics,
  calculateProfitMargin,
  findBiggestChange,
  findMostActiveMonth,
  generateRecommendations,
} from "./product.price.change.functions/product.price.change.functions";

const prisma = new PrismaClient();

export const product_price_change_history_summary = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId as string);

    if (!productId || isNaN(productId)) {
      throw new Error("Valid product ID is required");
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: {
        id: true,
        generic: { select: { name: true } },
        brand: { select: { name: true } },
        company: { select: { name: true } },
        averageCostPrice: true,
        averageRetailPrice: true,
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // Get all price history for this product (latest to oldest)
    const priceHistory = await prisma.productPriceHistory.findMany({
      where: { productId },
      orderBy: { effectiveDate: "desc" },
      include: {
        createdBy: { select: { fullname: true } },
      },
    });

    if (priceHistory.length === 0) {
      return successHandler(
        {
          product: {
            id: product.id,
            name: `${product.generic.name} - ${product.brand.name}`,
            company: product.company.name,
            currentCostPrice: parseFloat(product.averageCostPrice.toString()),
            currentRetailPrice: parseFloat(
              product.averageRetailPrice.toString()
            ),
          },
          summary: {
            totalChanges: 0,
            message: "No price change history found for this product",
          },
        },
        res,
        "GET",
        "Product price insights fetched successfully"
      );
    }

    // Calculate detailed insights
    const insights = calculatePriceInsights(priceHistory);
    const statistics = calculatePriceStatistics(priceHistory, product);
    const trends = analyzePriceTrends(priceHistory);

    // Format history with insights
    const formattedHistory = priceHistory.map((item, index) => {
      const insight = insights[index];
      return {
        id: item.id,
        effectiveDate: item.effectiveDate,
        previousCostPrice: item.previousCostPrice
          ? parseFloat(item.previousCostPrice.toString())
          : null,
        previousRetailPrice: item.previousRetailPrice
          ? parseFloat(item.previousRetailPrice.toString())
          : null,
        averageCostPrice: parseFloat(item.averageCostPrice.toString()),
        averageRetailPrice: parseFloat(item.averageRetailPrice.toString()),
        profitMargin: calculateProfitMargin(
          parseFloat(item.averageCostPrice.toString()),
          parseFloat(item.averageRetailPrice.toString())
        ),
        reason: item.reason,
        createdBy: item.createdBy.fullname,
        insight: insight || null,
      };
    });

    // Summary statistics
    const summary = {
      totalChanges: priceHistory.length,
      firstChangeDate: priceHistory[priceHistory.length - 1]?.effectiveDate,
      lastChangeDate: priceHistory[0]?.effectiveDate,
      averageChangeInterval: calculateAverageChangeInterval(priceHistory),
      priceIncreases: insights.filter((i) => i?.changeType === "increase")
        .length,
      priceDecreases: insights.filter((i) => i?.changeType === "decrease")
        .length,
      noChanges: insights.filter((i) => i?.changeType === "no_change").length,
      biggestIncrease: findBiggestChange(insights, "increase"),
      biggestDecrease: findBiggestChange(insights, "decrease"),
      mostActiveMonth: findMostActiveMonth(priceHistory),
      changeFrequency: calculateChangeFrequency(priceHistory),
    };

    const response = {
      product: {
        id: product.id,
        name: `${product.generic.name} - ${product.brand.name}`,
        company: product.company.name,
        currentCostPrice: parseFloat(product.averageCostPrice.toString()),
        currentRetailPrice: parseFloat(product.averageRetailPrice.toString()),
        currentProfitMargin: calculateProfitMargin(
          parseFloat(product.averageCostPrice.toString()),
          parseFloat(product.averageRetailPrice.toString())
        ),
      },
      summary,
      statistics,
      trends,
      history: formattedHistory,
      recommendations: generateRecommendations(statistics, trends, summary),
    };

    successHandler(
      response,
      res,
      "GET",
      "Product price insights fetched successfully"
    );
  }
);

export const product_price_change_history_read = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage as string) || 10;
    const search = (req.query.search as string)?.trim() || "";

    // Build a where clause that only contains the full-text search
    const whereClause: any = search
      ? {
          OR: [
            { product: { generic: { name: { contains: search } } } },
            { product: { brand: { name: { contains: search } } } },
          ],
        }
      : {};

    // Get all matching history records sorted by effectiveDate desc
    const allHistory = await prisma.productPriceHistory.findMany({
      orderBy: { effectiveDate: "desc" },
      where: whereClause,
      include: {
        product: {
          select: {
            generic: { select: { name: true } },
            brand: { select: { name: true } },
          },
        },
        createdBy: { select: { fullname: true } },
      },
    });

    // Group by product (generic + brand combination) and keep only the latest entry
    const productMap = new Map();

    allHistory.forEach((item) => {
      const genericName = item.product?.generic?.name ?? null;
      const brandName = item.product?.brand?.name ?? null;
      const productKey = `${genericName}-${brandName}`;

      // Only keep the first occurrence (latest due to desc ordering)
      if (!productMap.has(productKey)) {
        productMap.set(productKey, {
          id: item.id,
          productId: item.productId,
          genericName,
          brandName,
          previousCostPrice: item.previousCostPrice
            ? parseFloat(item.previousCostPrice.toString())
            : 0,
          previousRetailPrice: item.previousRetailPrice
            ? parseFloat(item.previousRetailPrice.toString())
            : 0,
          averageCostPrice: parseFloat(item.averageCostPrice.toString()),
          averageRetailPrice: parseFloat(item.averageRetailPrice.toString()),
          effectiveDate: item.effectiveDate,
          reason: item.reason,
          createdById: item.createdById,
          createdBy: item.createdBy.fullname,
        });
      }
    });

    // Convert map to array
    const uniqueProducts = Array.from(productMap.values());

    // Apply pagination to the grouped results
    const totalItems = uniqueProducts.length;
    const skip = (page - 1) * itemsPerPage;
    const paginatedHistory = uniqueProducts.slice(skip, skip + itemsPerPage);

    // Pagination metadata
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
        data: paginatedHistory,
      },
      res,
      "GET",
      "Product Price Change Log fetched successfully"
    );
  }
);
