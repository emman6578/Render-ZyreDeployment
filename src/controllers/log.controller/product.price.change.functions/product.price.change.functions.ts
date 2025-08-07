// Interface for price change analytics
export interface PriceChangeInsight {
  changeType: "increase" | "decrease" | "no_change";
  costPriceChange: {
    amount: number;
    percentage: number;
  };
  retailPriceChange: {
    amount: number;
    percentage: number;
  };
  daysSinceLastChange: number;
}

export interface PriceStatistics {
  costPrice: {
    current: number;
    highest: number;
    lowest: number;
    average: number;
    volatility: number; // Standard deviation
  };
  retailPrice: {
    current: number;
    highest: number;
    lowest: number;
    average: number;
    volatility: number;
  };
  profitMargin: {
    current: number;
    highest: number;
    lowest: number;
    average: number;
  };
}

export interface PriceTrend {
  period: string;
  trend: "upward" | "downward" | "stable";
  changeCount: number;
  averageChangeInterval: number; // days between changes
}

// Helper functions
export function calculatePriceInsights(
  history: any[]
): (PriceChangeInsight | null)[] {
  return history.map((current, index) => {
    if (index === history.length - 1) return null; // First record has no previous

    const previous = history[index + 1];
    const currentCost = parseFloat(current.averageCostPrice.toString());
    const currentRetail = parseFloat(current.averageRetailPrice.toString());
    const previousCost = parseFloat(previous.averageCostPrice.toString());
    const previousRetail = parseFloat(previous.averageRetailPrice.toString());

    const costChange = currentCost - previousCost;
    const retailChange = currentRetail - previousRetail;

    const costPercentage =
      previousCost !== 0 ? (costChange / previousCost) * 100 : 0;
    const retailPercentage =
      previousRetail !== 0 ? (retailChange / previousRetail) * 100 : 0;

    const daysSinceLastChange = Math.abs(
      (new Date(current.effectiveDate).getTime() -
        new Date(previous.effectiveDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    let changeType: "increase" | "decrease" | "no_change" = "no_change";
    if (costChange > 0 || retailChange > 0) changeType = "increase";
    else if (costChange < 0 || retailChange < 0) changeType = "decrease";

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

export function calculatePriceStatistics(
  history: any[],
  product: any
): PriceStatistics {
  const costPrices = history.map((h) =>
    parseFloat(h.averageCostPrice.toString())
  );
  const retailPrices = history.map((h) =>
    parseFloat(h.averageRetailPrice.toString())
  );
  const profitMargins = history.map((h) =>
    calculateProfitMargin(
      parseFloat(h.averageCostPrice.toString()),
      parseFloat(h.averageRetailPrice.toString())
    )
  );

  return {
    costPrice: {
      current: parseFloat(product.averageCostPrice.toString()),
      highest: Math.max(...costPrices),
      lowest: Math.min(...costPrices),
      average:
        Math.round(
          (costPrices.reduce((a, b) => a + b, 0) / costPrices.length) * 100
        ) / 100,
      volatility:
        Math.round(calculateStandardDeviation(costPrices) * 100) / 100,
    },
    retailPrice: {
      current: parseFloat(product.averageRetailPrice.toString()),
      highest: Math.max(...retailPrices),
      lowest: Math.min(...retailPrices),
      average:
        Math.round(
          (retailPrices.reduce((a, b) => a + b, 0) / retailPrices.length) * 100
        ) / 100,
      volatility:
        Math.round(calculateStandardDeviation(retailPrices) * 100) / 100,
    },
    profitMargin: {
      current: calculateProfitMargin(
        parseFloat(product.averageCostPrice.toString()),
        parseFloat(product.averageRetailPrice.toString())
      ),
      highest: Math.max(...profitMargins),
      lowest: Math.min(...profitMargins),
      average:
        Math.round(
          (profitMargins.reduce((a, b) => a + b, 0) / profitMargins.length) *
            100
        ) / 100,
    },
  };
}

export function analyzePriceTrends(history: any[]): PriceTrend[] {
  const trends: PriceTrend[] = [];

  // Last 30 days
  const last30Days = history.filter(
    (h) =>
      new Date(h.effectiveDate) >=
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  // Last 90 days
  const last90Days = history.filter(
    (h) =>
      new Date(h.effectiveDate) >=
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  );

  // Last 365 days
  const lastYear = history.filter(
    (h) =>
      new Date(h.effectiveDate) >=
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  );

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

export function determineTrend(data: any[]): "upward" | "downward" | "stable" {
  if (data.length < 2) return "stable";

  const first = parseFloat(data[data.length - 1].averageRetailPrice.toString());
  const last = parseFloat(data[0].averageRetailPrice.toString());
  const change = ((last - first) / first) * 100;

  if (change > 5) return "upward";
  if (change < -5) return "downward";
  return "stable";
}

export function calculateProfitMargin(
  costPrice: number,
  retailPrice: number
): number {
  if (costPrice === 0) return 0;
  return Math.round(((retailPrice - costPrice) / costPrice) * 10000) / 100;
}

export function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
  const avgSquaredDiff =
    squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  return Math.sqrt(avgSquaredDiff);
}

export function calculateAverageChangeInterval(history: any[]): number {
  if (history.length < 2) return 0;

  let totalDays = 0;
  for (let i = 0; i < history.length - 1; i++) {
    const days = Math.abs(
      (new Date(history[i].effectiveDate).getTime() -
        new Date(history[i + 1].effectiveDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    totalDays += days;
  }

  return Math.round(totalDays / (history.length - 1));
}

export function findBiggestChange(
  insights: (PriceChangeInsight | null)[],
  type: "increase" | "decrease"
) {
  const validInsights = insights.filter(
    (i) => i && i.changeType === type
  ) as PriceChangeInsight[];

  if (validInsights.length === 0) return null;

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

export function findMostActiveMonth(history: any[]): string | null {
  if (history.length === 0) return null;

  const monthCounts: { [key: string]: number } = {};

  history.forEach((h) => {
    const month = new Date(h.effectiveDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });

  return Object.keys(monthCounts).reduce((a, b) =>
    monthCounts[a] > monthCounts[b] ? a : b
  );
}

export function calculateChangeFrequency(history: any[]): string {
  if (history.length < 2) return "No changes";

  const firstDate = new Date(history[history.length - 1].effectiveDate);
  const lastDate = new Date(history[0].effectiveDate);
  const daysDiff = Math.abs(
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const changesPerMonth = (history.length / daysDiff) * 30;

  if (changesPerMonth >= 1)
    return `${Math.round(changesPerMonth)} times per month`;
  if (changesPerMonth >= 0.25)
    return `${Math.round(changesPerMonth * 4)} times per quarter`;
  return `${Math.round(changesPerMonth * 12)} times per year`;
}

export function generateRecommendations(
  statistics: PriceStatistics,
  trends: PriceTrend[],
  summary: any
): string[] {
  const recommendations: string[] = [];

  // Volatility recommendations
  if (statistics.retailPrice.volatility > 50) {
    recommendations.push(
      "High price volatility detected. Consider implementing more stable pricing strategy."
    );
  }

  // Profit margin recommendations
  if (statistics.profitMargin.current < 20) {
    recommendations.push(
      "Current profit margin is low. Review pricing strategy to improve profitability."
    );
  }

  if (statistics.profitMargin.current > 100) {
    recommendations.push(
      "Very high profit margin detected. Consider competitive pricing analysis."
    );
  }

  // Trend recommendations
  const recentTrend = trends.find((t) => t.period === "Last 30 days");
  if (recentTrend?.trend === "downward") {
    recommendations.push(
      "Recent downward price trend observed. Monitor market conditions and competitor pricing."
    );
  }

  // Frequency recommendations
  if (summary.totalChanges > 20) {
    recommendations.push(
      "Frequent price changes detected. Consider establishing more consistent pricing intervals."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Price change pattern appears stable and within normal ranges."
    );
  }

  return recommendations;
}
