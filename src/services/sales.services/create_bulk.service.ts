import {
  sanitizeSalesData,
  validateSalesData,
  validateUserPermissions,
} from "@controllers/sales.controller/validator";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { generateRefNumber } from "@utils/reference number/generateRefNumber";
import crypto from "crypto";

const prisma = new PrismaClient();

interface CreateSalesRequest {
  inventoryItemId: number;
  customerId?: number;
  customerName?: string;
  classification?: string; // Government, Private etc.
  districtId: number;
  psrId: number;
  quantity: number;
  unitDiscount?: number;
  paymentTerms?: "CASH" | "CREDIT_30" | "CREDIT_60" | "CREDIT_90";
  paymentMethod?:
    | "CASH"
    | "CHECK"
    | "BANK_TRANSFER"
    | "CREDIT_CARD"
    | "DEBIT_CARD";
  amountPaid?: number;
  dueDate?: string;
  invoiceNumber?: string;
  documentType?: string;
  transactionGroup?: string;
  notes?: string;
  areaCode?: string;
}

interface CreateSalesContext {
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}

// Validate inventory availability
const validateInventoryAvailability = async (
  inventoryItemId: number,
  requestedQuantity: number
) => {
  const inventoryItem = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    include: {
      batch: {
        include: {
          supplier: true,
        },
      },
      product: {
        include: {
          generic: true,
          brand: true,
          company: true,
        },
      },
    },
  });

  if (!inventoryItem) {
    throw new Error("Inventory item not found");
  }

  if (inventoryItem.status !== "ACTIVE") {
    throw new Error(
      `Inventory item is not active. Status: ${inventoryItem.status}`
    );
  }

  if (inventoryItem.currentQuantity < requestedQuantity) {
    throw new Error(
      `Insufficient stock. Available: ${inventoryItem.currentQuantity}, Requested: ${requestedQuantity}`
    );
  }

  // Check if batch is expired
  if (inventoryItem.batch.expiryDate < new Date()) {
    throw new Error("Cannot sell expired products");
  }

  return inventoryItem;
};

// Add this function after validateInventoryAvailability
const validateCumulativeInventoryAvailability = async (
  salesArray: CreateSalesRequest[],
  tx: any
) => {
  // Group sales by inventoryItemId to calculate cumulative quantities
  const inventoryItemGroups = new Map<number, number>();

  for (const sale of salesArray) {
    const currentTotal = inventoryItemGroups.get(sale.inventoryItemId) || 0;
    inventoryItemGroups.set(sale.inventoryItemId, currentTotal + sale.quantity);
  }

  // Validate each inventory item's cumulative availability
  for (const [inventoryItemId, totalRequestedQuantity] of inventoryItemGroups) {
    const inventoryItem = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: {
        batch: {
          include: {
            supplier: true,
          },
        },
        product: {
          include: {
            generic: true,
            brand: true,
            company: true,
          },
        },
      },
    });

    if (!inventoryItem) {
      throw new Error(`Inventory item ${inventoryItemId} not found`);
    }

    if (inventoryItem.status !== "ACTIVE") {
      throw new Error(
        `Inventory item ${inventoryItemId} is not active. Status: ${inventoryItem.status}`
      );
    }

    if (inventoryItem.currentQuantity < totalRequestedQuantity) {
      throw new Error(
        `Insufficient stock for cumulative sales. Available: ${inventoryItem.currentQuantity}, Total Requested: ${totalRequestedQuantity}`
      );
    }

    // Check if batch is expired
    if (inventoryItem.batch.expiryDate < new Date()) {
      throw new Error(
        `Cannot sell expired products for inventory item ${inventoryItemId}`
      );
    }
  }
};

// Add this function before the createSale function
const generateSaleHash = (
  saleData: CreateSalesRequest,
  userId: number
): string => {
  const normalizedData = {
    userId,
    data: saleData,
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizedData))
    .digest("hex");
};

// Add this validation function
const checkForDuplicateSale = async (saleHash: string, tx: any) => {
  const existingSale = await tx.sales.findUnique({
    where: { requestHash: saleHash },
    select: { id: true, transactionID: true, createdAt: true },
  });

  if (existingSale) {
    // Check if the duplicate was created within the last 5 minutes (configurable)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (existingSale.createdAt > fiveMinutesAgo) {
      throw new Error(
        `Duplicate sale detected. Sale ${existingSale.referenceNumber} was already created recently.`
      );
    }
  }
};

export const createSale = async (
  salesData: CreateSalesRequest | CreateSalesRequest[],
  context: CreateSalesContext
) => {
  const { userId, ipAddress, userAgent } = context;

  // Validate user permissions
  await validateUserPermissions(context.userId);
  // Sanitize input data
  const sanitizedData = sanitizeSalesData(salesData);
  // Validate all constraints
  await validateSalesData(sanitizedData, context);

  // Handle both single sale and array of sales
  const isArray = Array.isArray(salesData);
  const salesArray = isArray ? salesData : [salesData];

  // Validation for empty array
  if (salesArray.length === 0) {
    throw new Error("No sales data provided");
  }

  const checkForDuplicatesInArray = (salesArray: CreateSalesRequest[]) => {
    const seenHashes = new Set<string>();
    const duplicates: { index: number; hash: string }[] = [];

    salesArray.forEach((salesItem, index) => {
      const saleHash = generateSaleHash(salesItem, userId);

      if (seenHashes.has(saleHash)) {
        duplicates.push({ index, hash: saleHash });
      } else {
        seenHashes.add(saleHash);
      }
    });

    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate sales found in request at positions: ${duplicates
          .map((d) => d.index)
          .join(", ")}`
      );
    }
  };

  checkForDuplicatesInArray(salesArray);

  // Start transaction
  const results = await prisma.$transaction(async (tx) => {
    const createdSales = [];

    // Validate cumulative inventory availability first
    await validateCumulativeInventoryAvailability(salesArray, tx);

    for (const salesItem of salesArray) {
      const saleHash = generateSaleHash(salesItem, userId);
      // Check for duplicate individual sale
      await checkForDuplicateSale(saleHash, tx);
      const {
        inventoryItemId,
        customerId,
        customerName,
        classification,
        districtId,
        psrId,
        quantity,
        unitDiscount = 0,
        paymentTerms = "CASH",
        paymentMethod = "CASH",
        amountPaid = 0,
        dueDate,
        invoiceNumber,
        documentType,
        transactionGroup,
        notes,
      } = salesItem;

      // Validation for each item
      if (!inventoryItemId || !districtId || !psrId || !quantity) {
        throw new Error(
          "Required fields: inventoryItemId, districtId, psrId, quantity"
        );
      }

      if (quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      if (unitDiscount < 0) {
        throw new Error("Unit discount cannot be negative");
      }

      if (amountPaid < 0) {
        throw new Error("Amount paid cannot be negative");
      }

      if (!customerId && !customerName) {
        throw new Error("Either customerId or customerName must be provided");
      }

      // Get inventory item for this sale (already validated cumulatively)
      const inventoryItem = await tx.inventoryItem.findUnique({
        where: { id: inventoryItemId },
        include: {
          batch: {
            include: {
              supplier: true,
            },
          },
          product: {
            include: {
              generic: true,
              brand: true,
              company: true,
            },
          },
        },
      });

      if (!inventoryItem) {
        throw new Error(`Inventory item ${inventoryItemId} not found`);
      }

      // Validate PSR exists and is active
      const psr = await tx.pSR.findUnique({
        where: { id: psrId },
      });

      if (!psr || !psr.isActive) {
        throw new Error("PSR not found or inactive");
      }

      // Validate district exists and is active
      const district = await tx.district.findUnique({
        where: { id: districtId },
      });

      if (!district || !district.isActive) {
        throw new Error("District not found or inactive");
      }

      // Handle customer logic
      let finalCustomerId = customerId;
      let finalCustomerName = customerName;

      if (customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
        });

        if (!customer || !customer.isActive) {
          throw new Error("Customer not found or inactive");
        }

        finalCustomerName = customer.customerName;
      } else if (customerName) {
        const trimmedName = customerName.trim();

        // 1) Look for an existing customer with the same name, case‑insensitive
        const existing = await tx.customer.findFirst({
          where: {
            customerName: {
              equals: trimmedName,
            },
          },
        });

        if (existing) {
          // 2a) If found but inactive, throw an error
          if (!existing.isActive) {
            throw new Error("Customer exists but is inactive");
          }
          // 2b) Otherwise reuse their ID & name
          finalCustomerId = existing.id;
          finalCustomerName = existing.customerName;
        } else {
          // 3) If not found, create a brand‑new customer
          const newCustomer = await tx.customer.create({
            data: {
              customerName: trimmedName.toUpperCase(),
              createdById: userId,
            },
          });

          finalCustomerId = newCustomer.id;
          finalCustomerName = newCustomer.customerName;

          // 4) Log the auto‑creation
          await tx.activityLog.create({
            data: {
              userId,
              model: "Customer",
              recordId: newCustomer.id,
              action: "CREATE",
              description: `Auto-created customer: ${trimmedName} during sales transaction`,
              ipAddress,
              userAgent,
            },
          });
        }
      }

      // Calculate prices
      const unitRetailPrice = inventoryItem.retailPrice;
      const unitCostPrice = inventoryItem.costPrice;
      const totalBeforeDiscount = unitRetailPrice.mul(quantity);
      const totalDiscount = new Decimal(unitDiscount);
      const unitFinalPrice = totalBeforeDiscount.minus(totalDiscount);
      const balance = unitFinalPrice.minus(amountPaid);

      // Validate that balance is not negative
      if (balance.lt(0)) {
        throw new Error(
          `Amount paid cannot exceed the final price. Balance cannot be negative. Final price: ${unitFinalPrice}, Amount paid: ${amountPaid}`
        );
      }

      // Validate payment terms consistency with balance
      if (balance.gt(0) && paymentTerms === "CASH") {
        throw new Error(
          `Payment terms cannot be CASH when there is a balance owed. Balance: ${balance}, Payment Terms: ${paymentTerms}. Please select appropriate credit terms.`
        );
      }

      if (paymentTerms === "CASH" && balance.gt(0)) {
        throw new Error(
          `CASH payment terms require full payment. Current balance: ${balance}. Please pay the full amount or select credit terms.`
        );
      }

      // Validate that if balance is 0 (full payment), payment terms must be CASH
      if (balance.eq(0) && paymentTerms !== "CASH") {
        throw new Error(
          `When full payment is made (balance = 0), payment terms must be CASH. Current payment terms: ${paymentTerms}. Please change to CASH.`
        );
      }

      // Generate reference number for each sale
      const referenceNumber = await generateRefNumber(prisma, 6, "SALE");

      let calculatedDueDate = null;
      if (dueDate) {
        // If dueDate was provided in the request, use that
        calculatedDueDate = new Date(dueDate);
      } else if (paymentTerms !== "CASH") {
        // Calculate due date based on payment terms
        const daysToAdd = parseInt(paymentTerms.split("_")[1]) || 0;
        if (daysToAdd > 0) {
          calculatedDueDate = new Date();
          calculatedDueDate.setDate(calculatedDueDate.getDate() + daysToAdd);
        }
      }

      // Create sales record
      const sale = await tx.sales.create({
        data: {
          transactionID: referenceNumber,
          requestHash: saleHash,
          inventoryItemId,
          productId: inventoryItem.productId,
          genericName: inventoryItem.product.generic.name,
          brandName: inventoryItem.product.brand.name,
          companyName: inventoryItem.product.company.name,
          batchNumber: inventoryItem.batch.batchNumber,
          expiryDate: inventoryItem.batch.expiryDate,
          supplierName: inventoryItem.batch.supplier.name,
          customerId: finalCustomerId,
          customerName: finalCustomerName,
          classification: classification
            ? classification.toUpperCase()
            : classification,
          districtId,
          areaCode: psr.areaCode,
          psrId,
          quantity,
          unitCostPrice,
          unitRetailPrice,
          unitDiscount: totalDiscount,
          unitFinalPrice,
          paymentTerms,
          paymentMethod,
          amountPaid: new Decimal(amountPaid),
          balance,
          dueDate: calculatedDueDate,
          invoiceNumber,
          documentType,
          transactionGroup,
          notes,
          createdById: userId,
        },
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
                },
              },
            },
          },
          customer: true,
          district: true,
          psr: true,
        },
      });

      // Update inventory item quantity
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          currentQuantity: inventoryItem.currentQuantity - quantity,
          updatedBy: { connect: { id: userId } },
          lastUpdateReason: `Sale: ${referenceNumber}`,
        },
      });

      // Create inventory movement record
      await tx.inventoryMovement.create({
        data: {
          inventoryItemId,
          movementType: "OUTBOUND",
          quantity: -quantity,
          reason: `Sale: ${referenceNumber}`,
          referenceId: referenceNumber,
          previousQuantity: inventoryItem.currentQuantity,
          newQuantity: inventoryItem.currentQuantity - quantity,
          createdById: userId,
        },
      });

      // Create product transaction record
      await tx.productTransaction.create({
        data: {
          referenceNumber,
          productId: inventoryItem.productId,
          transactionType: "SALE",
          quantityOut: quantity,
          costPrice: unitCostPrice,
          retailPrice: unitRetailPrice,
          userId,
          sourceModel: "Sales",
          sourceId: sale.id,
          description: `Sale of ${quantity} units of ${inventoryItem.product.generic.name} (${inventoryItem.product.brand.name}) - ${referenceNumber}`,
        },
      });

      // Log activity for sales creation
      await tx.activityLog.create({
        data: {
          userId,
          model: "Sales",
          recordId: sale.id,
          action: "CREATE",
          description: `Created sale ${referenceNumber} for ${quantity} units of ${
            inventoryItem.product.generic.name
          }${
            finalCustomerId !== customerId
              ? " (with auto-created customer)"
              : ""
          }`,
          ipAddress,
          userAgent,
        },
      });

      createdSales.push(sale);
    }

    // Update product average prices for all affected products
    // Collect all affected product IDs by resolving promises
    const productIdPromises = salesArray.map((item) =>
      prisma.inventoryItem
        .findUnique({
          where: { id: item.inventoryItemId },
          select: { productId: true },
        })
        .then((i) => i?.productId)
    );
    const affectedProductIdsRaw = await Promise.all(productIdPromises);
    const affectedProductIds = [...new Set(affectedProductIdsRaw)].filter(
      Boolean
    );

    for (const productId of affectedProductIds) {
      if (!productId) continue;

      const productStats = await tx.inventoryItem.aggregate({
        where: {
          productId,
          status: "ACTIVE",
        },
        _avg: {
          costPrice: true,
          retailPrice: true,
        },
      });

      if (productStats._avg.costPrice && productStats._avg.retailPrice) {
        await tx.product.update({
          where: { id: productId },
          data: {
            averageCostPrice: productStats._avg.costPrice,
            averageRetailPrice: productStats._avg.retailPrice,
            updatedById: userId,
          },
        });
      }
    }

    return isArray ? createdSales : createdSales[0];
  });

  return results;
};
