import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export interface SalesQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  status?: string;
  paymentTerms?: string;
  paymentMethod?: string;
  districtId?: string;
  psrId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface SalesSummary {
  totalRevenue: number;
  totalCOGS: number;
  totalGrossProfit: number;
  totalQuantitySold: number;
  averageOrderValue: number;
  totalAmountPaid: number;
  totalBalance: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

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
] as const;

type SortableField = (typeof SORTABLE_FIELDS)[number];

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

const calculateSalesSummary = (sales: any[]): SalesSummary => {
  const summary = sales.reduce(
    (acc, sale) => {
      // Calculate total revenue: unitFinalPrice is already the total price for this sale
      const revenue = sale.unitFinalPrice;

      // Calculate COGS: quantity * costPrice
      const cogs = sale.inventoryItem?.costPrice
        ? sale.quantity * sale.inventoryItem.costPrice
        : 0;

      // Calculate returns impact
      const processedReturns = (sale.returns || []).filter(
        (r: any) => r.status === "PROCESSED"
      );

      const returnedQty = processedReturns.reduce(
        (sum: number, r: any) => sum + (r.returnQuantity || 0),
        0
      );

      const returnedRevenue = processedReturns.reduce(
        (sum: number, r: any) => sum + (r.returnPrice || 0),
        0
      );

      const returnedCOGS = sale.inventoryItem?.costPrice
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

export const getSalesData = async (queryParams: SalesQueryParams) => {
  const {
    page = "1",
    limit = "10",
    search = "",
    sortField = "createdAt",
    sortOrder = "desc",
    status,
    paymentTerms,
    paymentMethod,
    districtId,
    psrId,
    customerId,
    dateFrom,
    dateTo,
  } = queryParams;

  // Validate and parse pagination parameters
  const currentPage = Math.max(1, parseInt(page) || 1);
  const itemsPerPage = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const skip = (currentPage - 1) * itemsPerPage;

  // Validate sort parameters
  const validSortField = SORTABLE_FIELDS.includes(sortField as SortableField)
    ? (sortField as SortableField)
    : "createdAt";
  const validSortOrder = sortOrder === "asc" ? "asc" : "desc";

  // Build where clause for filtering
  const whereClause: any = {
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
  const orderBy: any = {};
  orderBy[validSortField] = validSortOrder;

  // Execute queries in parallel
  const [sales, totalCount, summaryData] = await Promise.all([
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

    await prisma.sales.findMany({
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

  const pagination: PaginationInfo = {
    currentPage,
    totalPages,
    totalItems: totalCount,
    itemsPerPage,
    hasNextPage,
    hasPreviousPage,
  };

  // Add currentQuantity to each sale (quantity - sum of PROCESSED returns)
  const salesWithCurrentQuantity = sales.map((sale: any) => {
    const processedReturns = (sale.returns || []).filter(
      (r: any) => r.status === "PROCESSED"
    );
    const returnedQty = processedReturns.reduce(
      (sum: number, r: any) => sum + (r.returnQuantity || 0),
      0
    );
    return {
      ...sale,
      currentQuantity: sale.quantity - returnedQty,
    };
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
};
