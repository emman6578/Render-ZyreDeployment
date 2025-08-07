"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePriceInsights = calculatePriceInsights;
exports.calculatePriceStatistics = calculatePriceStatistics;
exports.analyzePriceTrends = analyzePriceTrends;
exports.determineTrend = determineTrend;
exports.calculateProfitMargin = calculateProfitMargin;
exports.calculateStandardDeviation = calculateStandardDeviation;
exports.calculateAverageChangeInterval = calculateAverageChangeInterval;
exports.findBiggestChange = findBiggestChange;
exports.findMostActiveMonth = findMostActiveMonth;
exports.generateRecommendations = generateRecommendations;
exports.calculatePriceStabilityScore = calculatePriceStabilityScore;
exports.assessProfitMarginHealth = assessProfitMarginHealth;
exports.calculateBatchHealthScore = calculateBatchHealthScore;
exports.generateBatchRecommendations = generateBatchRecommendations;
// Helper functions for inventory price analysis
function calculatePriceInsights(history) {
    return history.map((current, index) => {
        if (index === history.length - 1)
            return null; // First record has no previous
        const previous = history[index + 1];
        const currentCost = parseFloat(current.averageCostPrice.toString());
        const currentRetail = parseFloat(current.averageRetailPrice.toString());
        const previousCost = parseFloat(previous.averageCostPrice.toString());
        const previousRetail = parseFloat(previous.averageRetailPrice.toString());
        const costChange = currentCost - previousCost;
        const retailChange = currentRetail - previousRetail;
        const costPercentage = previousCost !== 0 ? (costChange / previousCost) * 100 : 0;
        const retailPercentage = previousRetail !== 0 ? (retailChange / previousRetail) * 100 : 0;
        const daysSinceLastChange = Math.abs((new Date(current.effectiveDate).getTime() -
            new Date(previous.effectiveDate).getTime()) /
            (1000 * 60 * 60 * 24));
        let changeType = "no_change";
        if (costChange > 0 || retailChange > 0)
            changeType = "increase";
        else if (costChange < 0 || retailChange < 0)
            changeType = "decrease";
        return {
            changeType,
            costPriceChange: {
                amount: Math.round(costChange * 100) / 100,
                percentage: Math.round(costPercentage * 100) / 100,
            },
            retailPriceChange: {
                amount: Math.round(retailChange * 100) / 100,
                percentage: Math.round(retailPercentage * 100) / 100,
            },
            daysSinceLastChange: Math.round(daysSinceLastChange),
        };
    });
}
function calculatePriceStatistics(history, product) {
    const costPrices = history.map((h) => parseFloat(h.averageCostPrice.toString()));
    const retailPrices = history.map((h) => parseFloat(h.averageRetailPrice.toString()));
    const profitMargins = history.map((h) => calculateProfitMargin(parseFloat(h.averageCostPrice.toString()), parseFloat(h.averageRetailPrice.toString())));
    return {
        costPrice: {
            current: parseFloat(product.averageCostPrice.toString()),
            highest: Math.max(...costPrices),
            lowest: Math.min(...costPrices),
            average: Math.round((costPrices.reduce((a, b) => a + b, 0) / costPrices.length) * 100) / 100,
            volatility: Math.round(calculateStandardDeviation(costPrices) * 100) / 100,
        },
        retailPrice: {
            current: parseFloat(product.averageRetailPrice.toString()),
            highest: Math.max(...retailPrices),
            lowest: Math.min(...retailPrices),
            average: Math.round((retailPrices.reduce((a, b) => a + b, 0) / retailPrices.length) * 100) / 100,
            volatility: Math.round(calculateStandardDeviation(retailPrices) * 100) / 100,
        },
        profitMargin: {
            current: calculateProfitMargin(parseFloat(product.averageCostPrice.toString()), parseFloat(product.averageRetailPrice.toString())),
            highest: Math.max(...profitMargins),
            lowest: Math.min(...profitMargins),
            average: Math.round((profitMargins.reduce((a, b) => a + b, 0) / profitMargins.length) *
                100) / 100,
        },
    };
}
function analyzePriceTrends(history) {
    const trends = [];
    // Last 30 days
    const last30Days = history.filter((h) => new Date(h.effectiveDate) >=
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    // Last 90 days
    const last90Days = history.filter((h) => new Date(h.effectiveDate) >=
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    // Last 365 days
    const lastYear = history.filter((h) => new Date(h.effectiveDate) >=
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
    const periods = [
        { data: last30Days, period: "Last 30 days" },
        { data: last90Days, period: "Last 90 days" },
        { data: lastYear, period: "Last year" },
    ];
    periods.forEach(({ data, period }) => {
        if (data.length > 1) {
            const trend = determineTrend(data);
            const changeCount = data.length;
            const averageInterval = calculateAverageChangeInterval(data);
            trends.push({
                period,
                trend,
                changeCount,
                averageChangeInterval: averageInterval,
            });
        }
    });
    return trends;
}
function determineTrend(data) {
    if (data.length < 2)
        return "stable";
    const first = parseFloat(data[data.length - 1].averageRetailPrice.toString());
    const last = parseFloat(data[0].averageRetailPrice.toString());
    const change = ((last - first) / first) * 100;
    if (change > 5)
        return "upward";
    if (change < -5)
        return "downward";
    return "stable";
}
function calculateProfitMargin(costPrice, retailPrice) {
    if (costPrice === 0)
        return 0;
    return Math.round(((retailPrice - costPrice) / costPrice) * 10000) / 100;
}
function calculateStandardDeviation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    return Math.sqrt(avgSquaredDiff);
}
function calculateAverageChangeInterval(history) {
    if (history.length < 2)
        return 0;
    let totalDays = 0;
    for (let i = 0; i < history.length - 1; i++) {
        const days = Math.abs((new Date(history[i].effectiveDate).getTime() -
            new Date(history[i + 1].effectiveDate).getTime()) /
            (1000 * 60 * 60 * 24));
        totalDays += days;
    }
    return Math.round(totalDays / (history.length - 1));
}
function findBiggestChange(insights, type) {
    const validInsights = insights.filter((i) => i && i.changeType === type);
    if (validInsights.length === 0)
        return null;
    const biggest = validInsights.reduce((max, current) => {
        const currentChange = Math.abs(current.retailPriceChange.percentage);
        const maxChange = Math.abs(max.retailPriceChange.percentage);
        return currentChange > maxChange ? current : max;
    });
    return {
        costPriceChange: biggest.costPriceChange,
        retailPriceChange: biggest.retailPriceChange,
    };
}
function findMostActiveMonth(history) {
    if (history.length === 0)
        return null;
    const monthCounts = {};
    history.forEach((h) => {
        const month = new Date(h.effectiveDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
        });
        monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    return Object.keys(monthCounts).reduce((a, b) => monthCounts[a] > monthCounts[b] ? a : b);
}
function generateRecommendations(statistics, trends, summary) {
    const recommendations = [];
    // Volatility recommendations
    if (statistics.retailPrice.volatility > 50) {
        recommendations.push("High inventory price volatility detected. Consider implementing more stable pricing strategy for inventory items.");
    }
    // Profit margin recommendations
    if (statistics.profitMargin.current < 20) {
        recommendations.push("Current inventory profit margin is low. Review pricing strategy to improve profitability on inventory items.");
    }
    if (statistics.profitMargin.current > 100) {
        recommendations.push("Very high inventory profit margin detected. Consider competitive pricing analysis for inventory items.");
    }
    // Trend recommendations
    const recentTrend = trends.find((t) => t.period === "Last 30 days");
    if ((recentTrend === null || recentTrend === void 0 ? void 0 : recentTrend.trend) === "downward") {
        recommendations.push("Recent downward inventory price trend observed. Monitor market conditions and supplier pricing.");
    }
    // Frequency recommendations
    if (summary.totalChanges > 20) {
        recommendations.push("Frequent inventory price changes detected. Consider establishing more consistent pricing intervals for inventory management.");
    }
    // Inventory-specific recommendations
    if (statistics.costPrice.volatility > 30) {
        recommendations.push("High cost price volatility in inventory. Consider negotiating fixed-term contracts with suppliers.");
    }
    if (recommendations.length === 0) {
        recommendations.push("Inventory price change pattern appears stable and within normal ranges.");
    }
    return recommendations;
}
function calculatePriceStabilityScore(statistics) {
    // Lower volatility = higher stability score (0-100)
    const retailVolatility = statistics.retailPrice.volatility;
    const costVolatility = statistics.costPrice.volatility;
    const avgVolatility = (retailVolatility + costVolatility) / 2;
    return Math.max(0, Math.min(100, 100 - avgVolatility));
}
function assessProfitMarginHealth(currentMargin) {
    if (currentMargin < 10)
        return "Poor - Very low profit margin";
    if (currentMargin < 20)
        return "Fair - Below average profit margin";
    if (currentMargin < 40)
        return "Good - Healthy profit margin";
    if (currentMargin < 60)
        return "Very Good - Strong profit margin";
    if (currentMargin < 100)
        return "Excellent - High profit margin";
    return "Exceptional - Very high profit margin (review competitiveness)";
}
function calculateBatchHealthScore(productAnalytics) {
    if (productAnalytics.length === 0)
        return 0;
    const scores = productAnalytics.map((p) => p.analytics.summary.priceStabilityScore);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(averageScore * 100) / 100;
}
function generateBatchRecommendations(batchSummary, productAnalytics) {
    const recommendations = [];
    // Batch-level recommendations
    if (batchSummary.batchHealthScore < 60) {
        recommendations.push("Batch shows high price volatility. Consider reviewing supplier agreements and pricing strategies.");
    }
    if (batchSummary.averageChangesPerProduct > 5) {
        recommendations.push("High frequency of price changes detected. Consider implementing more stable pricing intervals.");
    }
    // Check for products with concerning trends
    const poorPerformers = productAnalytics.filter((p) => p.analytics.summary.priceStabilityScore < 50);
    if (poorPerformers.length > 0) {
        recommendations.push(`${poorPerformers.length} product(s) show concerning price volatility. Focus on stabilizing these items first.`);
    }
    // Check overall profitability
    const lowMarginProducts = productAnalytics.filter((p) => p.analytics.statistics.profitMargin.current < 20);
    if (lowMarginProducts.length > 0) {
        recommendations.push(`${lowMarginProducts.length} product(s) have low profit margins. Review pricing strategy for these items.`);
    }
    if (recommendations.length === 0) {
        recommendations.push("Batch pricing appears stable and within acceptable ranges. Continue monitoring for any changes.");
    }
    return recommendations;
}
