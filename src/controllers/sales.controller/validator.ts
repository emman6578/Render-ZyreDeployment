import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export interface CreateSalesRequest {
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

export interface CreateSalesContext {
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}

// Validation constants
const VALIDATION_LIMITS = {
  MAX_QUANTITY: 999999,
  MIN_QUANTITY: 1,
  MAX_DISCOUNT: 999999.99,
  MIN_DISCOUNT: 0,
  MAX_AMOUNT_PAID: 999999999.99,
  MIN_AMOUNT_PAID: 0,
  MAX_CUSTOMER_NAME_LENGTH: 255,
  MIN_CUSTOMER_NAME_LENGTH: 2,
  MAX_NOTES_LENGTH: 1000,
  MAX_INVOICE_NUMBER_LENGTH: 100,
  MAX_DOCUMENT_TYPE_LENGTH: 50,
  MAX_TRANSACTION_GROUP_LENGTH: 100,
  MAX_AREA_CODE_LENGTH: 20,
  MAX_SALES_BATCH_SIZE: 100,
  FUTURE_DATE_LIMIT_DAYS: 365,
  PAST_DATE_LIMIT_DAYS: 30,
};

// Enum validation arrays
const VALID_PAYMENT_TERMS = ["CASH", "CREDIT_30", "CREDIT_60", "CREDIT_90"];
const VALID_PAYMENT_METHODS = [
  "CASH",
  "CHECK",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "DEBIT_CARD",
];
const CASH_PAYMENT_METHODS = ["CASH"];
const CREDIT_PAYMENT_METHODS = ["CHECK", "BANK_TRANSFER"];
const DIGITAL_PAYMENT_METHODS = ["GCASH", "PAYMAYA"];

/**
 * Validates basic data types and formats
 */
export const validateBasicTypes = (
  salesData: CreateSalesRequest | CreateSalesRequest[]
) => {
  const salesArray = Array.isArray(salesData) ? salesData : [salesData];

  // Check for empty array
  if (salesArray.length === 0) {
    throw new Error("Sales data cannot be empty");
  }

  // Check batch size limit
  if (salesArray.length > VALIDATION_LIMITS.MAX_SALES_BATCH_SIZE) {
    throw new Error(
      `Cannot process more than ${VALIDATION_LIMITS.MAX_SALES_BATCH_SIZE} sales at once`
    );
  }

  salesArray.forEach((sale, index) => {
    const prefix = salesArray.length > 1 ? `Sale ${index + 1}: ` : "";

    // Required field validation
    if (!sale.inventoryItemId || typeof sale.inventoryItemId !== "number") {
      throw new Error(
        `${prefix}inventoryItemId is required and must be a number`
      );
    }

    if (!sale.districtId || typeof sale.districtId !== "number") {
      throw new Error(`${prefix}districtId is required and must be a number`);
    }

    if (!sale.psrId || typeof sale.psrId !== "number") {
      throw new Error(`${prefix}psrId is required and must be a number`);
    }

    if (!sale.quantity || typeof sale.quantity !== "number") {
      throw new Error(`${prefix}quantity is required and must be a number`);
    }

    // Make invoiceNumber required and not empty/whitespace
    if (
      !sale.invoiceNumber ||
      typeof sale.invoiceNumber !== "string" ||
      sale.invoiceNumber.trim().length === 0
    ) {
      throw new Error(`${prefix}invoiceNumber is required and cannot be empty`);
    }

    // Make documentType required and not empty/whitespace
    if (
      !sale.documentType ||
      typeof sale.documentType !== "string" ||
      sale.documentType.trim().length === 0
    ) {
      throw new Error(`${prefix}documentType is required and cannot be empty`);
    }

    // Customer validation - either customerId or customerName must be provided
    if (!sale.customerId && !sale.customerName) {
      throw new Error(
        `${prefix}Either customerId or customerName must be provided`
      );
    }

    if (sale.customerId && sale.customerName) {
      throw new Error(
        `${prefix}Cannot provide both customerId and customerName`
      );
    }

    // Type validation for optional fields
    if (sale.customerId !== undefined && typeof sale.customerId !== "number") {
      throw new Error(`${prefix}customerId must be a number`);
    }

    if (
      sale.customerName !== undefined &&
      typeof sale.customerName !== "string"
    ) {
      throw new Error(`${prefix}customerName must be a string`);
    }

    if (
      sale.unitDiscount !== undefined &&
      typeof sale.unitDiscount !== "number"
    ) {
      throw new Error(`${prefix}unitDiscount must be a number`);
    }

    if (sale.amountPaid !== undefined && typeof sale.amountPaid !== "number") {
      throw new Error(`${prefix}amountPaid must be a number`);
    }

    // String length validations
    if (
      sale.customerName &&
      (sale.customerName.length < VALIDATION_LIMITS.MIN_CUSTOMER_NAME_LENGTH ||
        sale.customerName.length > VALIDATION_LIMITS.MAX_CUSTOMER_NAME_LENGTH)
    ) {
      throw new Error(
        `${prefix}customerName must be between ${VALIDATION_LIMITS.MIN_CUSTOMER_NAME_LENGTH} and ${VALIDATION_LIMITS.MAX_CUSTOMER_NAME_LENGTH} characters`
      );
    }

    if (sale.notes && sale.notes.length > VALIDATION_LIMITS.MAX_NOTES_LENGTH) {
      throw new Error(
        `${prefix}notes cannot exceed ${VALIDATION_LIMITS.MAX_NOTES_LENGTH} characters`
      );
    }

    if (
      sale.invoiceNumber &&
      sale.invoiceNumber.length > VALIDATION_LIMITS.MAX_INVOICE_NUMBER_LENGTH
    ) {
      throw new Error(
        `${prefix}invoiceNumber cannot exceed ${VALIDATION_LIMITS.MAX_INVOICE_NUMBER_LENGTH} characters`
      );
    }

    if (
      sale.documentType &&
      sale.documentType.length > VALIDATION_LIMITS.MAX_DOCUMENT_TYPE_LENGTH
    ) {
      throw new Error(
        `${prefix}documentType cannot exceed ${VALIDATION_LIMITS.MAX_DOCUMENT_TYPE_LENGTH} characters`
      );
    }

    if (
      sale.transactionGroup &&
      sale.transactionGroup.length >
        VALIDATION_LIMITS.MAX_TRANSACTION_GROUP_LENGTH
    ) {
      throw new Error(
        `${prefix}transactionGroup cannot exceed ${VALIDATION_LIMITS.MAX_TRANSACTION_GROUP_LENGTH} characters`
      );
    }

    if (
      sale.areaCode &&
      sale.areaCode.length > VALIDATION_LIMITS.MAX_AREA_CODE_LENGTH
    ) {
      throw new Error(
        `${prefix}areaCode cannot exceed ${VALIDATION_LIMITS.MAX_AREA_CODE_LENGTH} characters`
      );
    }
  });
};

/**
 * Validates numeric ranges and business logic
 */
export const validateNumericRanges = (
  salesData: CreateSalesRequest | CreateSalesRequest[]
) => {
  const salesArray = Array.isArray(salesData) ? salesData : [salesData];

  salesArray.forEach((sale, index) => {
    const prefix = salesArray.length > 1 ? `Sale ${index + 1}: ` : "";

    // Quantity validation
    if (
      sale.quantity < VALIDATION_LIMITS.MIN_QUANTITY ||
      sale.quantity > VALIDATION_LIMITS.MAX_QUANTITY
    ) {
      throw new Error(
        `${prefix}quantity must be between ${VALIDATION_LIMITS.MIN_QUANTITY} and ${VALIDATION_LIMITS.MAX_QUANTITY}`
      );
    }

    if (!Number.isInteger(sale.quantity)) {
      throw new Error(`${prefix}quantity must be a whole number`);
    }

    // Discount validation
    const unitDiscount = sale.unitDiscount || 0;
    if (
      unitDiscount < VALIDATION_LIMITS.MIN_DISCOUNT ||
      unitDiscount > VALIDATION_LIMITS.MAX_DISCOUNT
    ) {
      throw new Error(
        `${prefix}unitDiscount must be between ${VALIDATION_LIMITS.MIN_DISCOUNT} and ${VALIDATION_LIMITS.MAX_DISCOUNT}`
      );
    }

    // Amount paid validation
    const amountPaid = sale.amountPaid || 0;
    if (
      amountPaid < VALIDATION_LIMITS.MIN_AMOUNT_PAID ||
      amountPaid > VALIDATION_LIMITS.MAX_AMOUNT_PAID
    ) {
      throw new Error(
        `${prefix}amountPaid must be between ${VALIDATION_LIMITS.MIN_AMOUNT_PAID} and ${VALIDATION_LIMITS.MAX_AMOUNT_PAID}`
      );
    }
  });
};

/**
 * Validates enum values and business rules
 */
export const validateEnumsAndBusinessRules = (
  salesData: CreateSalesRequest | CreateSalesRequest[]
) => {
  const salesArray = Array.isArray(salesData) ? salesData : [salesData];

  salesArray.forEach((sale, index) => {
    const prefix = salesArray.length > 1 ? `Sale ${index + 1}: ` : "";

    // Payment terms validation
    const paymentTerms = sale.paymentTerms || "CASH";
    if (!VALID_PAYMENT_TERMS.includes(paymentTerms)) {
      throw new Error(
        `${prefix}paymentTerms must be one of: ${VALID_PAYMENT_TERMS.join(
          ", "
        )}`
      );
    }

    // Payment method validation
    const paymentMethod = sale.paymentMethod || "CASH";
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error(
        `${prefix}paymentMethod must be one of: ${VALID_PAYMENT_METHODS.join(
          ", "
        )}`
      );
    }

    // Business rule: Payment method must be compatible with payment terms
    if (
      paymentTerms === "CASH" &&
      !CASH_PAYMENT_METHODS.includes(paymentMethod) &&
      !DIGITAL_PAYMENT_METHODS.includes(paymentMethod)
    ) {
      throw new Error(
        `${prefix}Cash sales must use cash or digital payment methods`
      );
    }

    // Business rule: Amount paid validation based on payment terms
    const amountPaid = sale.amountPaid || 0;
    if (paymentTerms === "CASH" && amountPaid === 0) {
      throw new Error(
        `${prefix}Cash sales require amount paid to be greater than 0`
      );
    }

    // Business rule: Due date validation
    if (sale.dueDate) {
      const dueDate = new Date(sale.dueDate);
      const today = new Date();
      const futureLimit = new Date();
      futureLimit.setDate(
        today.getDate() + VALIDATION_LIMITS.FUTURE_DATE_LIMIT_DAYS
      );

      if (isNaN(dueDate.getTime())) {
        throw new Error(`${prefix}dueDate must be a valid date`);
      }

      if (dueDate < today) {
        throw new Error(`${prefix}dueDate cannot be in the past`);
      }

      if (dueDate > futureLimit) {
        throw new Error(
          `${prefix}dueDate cannot be more than ${VALIDATION_LIMITS.FUTURE_DATE_LIMIT_DAYS} days in the future`
        );
      }

      // Due date should only be provided for credit sales
      if (paymentTerms === "CASH") {
        throw new Error(
          `${prefix}dueDate should not be provided for cash sales`
        );
      }
    }
  });
};

/**
 * Validates string formats and patterns
 */
export const validateStringFormats = (
  salesData: CreateSalesRequest | CreateSalesRequest[]
) => {
  const salesArray = Array.isArray(salesData) ? salesData : [salesData];

  salesArray.forEach((sale, index) => {
    const prefix = salesArray.length > 1 ? `Sale ${index + 1}: ` : "";

    // Customer name validation
    if (sale.customerName) {
      const trimmedName = sale.customerName.trim();
      if (trimmedName.length === 0) {
        throw new Error(
          `${prefix}customerName cannot be empty or only whitespace`
        );
      }

      // Check for valid characters (allow letters, numbers, spaces, and common punctuation)
      const validNamePattern = /^[a-zA-Z0-9\s\-_.,&()]+$/;
      if (!validNamePattern.test(trimmedName)) {
        throw new Error(`${prefix}customerName contains invalid characters`);
      }

      // Check for consecutive spaces
      if (trimmedName.includes("  ")) {
        throw new Error(
          `${prefix}customerName cannot contain consecutive spaces`
        );
      }
    }

    // Invoice number validation
    if (sale.invoiceNumber) {
      const trimmedInvoice = sale.invoiceNumber.trim();
      if (trimmedInvoice.length === 0) {
        throw new Error(
          `${prefix}invoiceNumber cannot be empty or only whitespace`
        );
      }

      // Basic alphanumeric pattern for invoice numbers
      const validInvoicePattern = /^[a-zA-Z0-9\-_/]+$/;
      if (!validInvoicePattern.test(trimmedInvoice)) {
        throw new Error(
          `${prefix}invoiceNumber can only contain letters, numbers, hyphens, underscores, and forward slashes`
        );
      }
    }

    // Classification validation
    if (sale.classification) {
      const trimmedClassification = sale.classification.trim();
      if (trimmedClassification.length === 0) {
        throw new Error(
          `${prefix}classification cannot be empty or only whitespace`
        );
      }

      // Classification should be letters, numbers, spaces, and common punctuation
      const validClassificationPattern = /^[a-zA-Z0-9\s\-_.,&()]+$/;
      if (!validClassificationPattern.test(trimmedClassification)) {
        throw new Error(`${prefix}classification contains invalid characters`);
      }

      // Check for consecutive spaces
      if (trimmedClassification.includes("  ")) {
        throw new Error(
          `${prefix}classification cannot contain consecutive spaces`
        );
      }

      // Check length limit
      if (trimmedClassification.length > 50) {
        throw new Error(`${prefix}classification cannot exceed 50 characters`);
      }
    }

    // Area code validation
    if (sale.areaCode) {
      const trimmedAreaCode = sale.areaCode.trim();
      if (trimmedAreaCode.length === 0) {
        throw new Error(`${prefix}areaCode cannot be empty or only whitespace`);
      }

      // Area code should be alphanumeric
      const validAreaCodePattern = /^[a-zA-Z0-9]+$/;
      if (!validAreaCodePattern.test(trimmedAreaCode)) {
        throw new Error(
          `${prefix}areaCode can only contain letters and numbers`
        );
      }
    }

    // Document type validation
    if (sale.documentType) {
      const trimmedDocType = sale.documentType.trim();
      if (trimmedDocType.length === 0) {
        throw new Error(
          `${prefix}documentType cannot be empty or only whitespace`
        );
      }

      // Common document types
      const validDocTypes = [
        "INVOICE",
        "RECEIPT",
        "DELIVERY_RECEIPT",
        "SALES_INVOICE",
        "CASH_RECEIPT",
      ];
      if (!validDocTypes.includes(trimmedDocType.toUpperCase())) {
        console.warn(
          `${prefix}documentType "${trimmedDocType}" is not a standard document type`
        );
      }
    }

    // Transaction group validation (should be UUID-like or reference number)
    if (sale.transactionGroup) {
      const trimmedTxnGroup = sale.transactionGroup.trim();
      if (trimmedTxnGroup.length === 0) {
        throw new Error(
          `${prefix}transactionGroup cannot be empty or only whitespace`
        );
      }

      // Should be alphanumeric with hyphens
      const validTxnGroupPattern = /^[a-zA-Z0-9\-]+$/;
      if (!validTxnGroupPattern.test(trimmedTxnGroup)) {
        throw new Error(
          `${prefix}transactionGroup can only contain letters, numbers, and hyphens`
        );
      }
    }

    // Notes validation
    if (sale.notes) {
      const trimmedNotes = sale.notes.trim();
      if (trimmedNotes.length === 0) {
        throw new Error(`${prefix}notes cannot be empty or only whitespace`);
      }

      // Notes should not contain potentially harmful characters
      const dangerousChars = /<script|<iframe|javascript:|data:/i;
      if (dangerousChars.test(trimmedNotes)) {
        throw new Error(`${prefix}notes contain potentially harmful content`);
      }
    }
  });
};

/**
 * Validates context information
 */
export const validateContext = (context: CreateSalesContext) => {
  if (!context.userId || typeof context.userId !== "number") {
    throw new Error("userId is required and must be a number");
  }

  if (context.userId <= 0) {
    throw new Error("userId must be a positive number");
  }

  if (context.ipAddress && typeof context.ipAddress !== "string") {
    throw new Error("ipAddress must be a string");
  }

  if (context.userAgent && typeof context.userAgent !== "string") {
    throw new Error("userAgent must be a string");
  }
};

/**
 * Validates database relationships and business constraints
 */
export const validateDatabaseConstraints = async (
  salesData: CreateSalesRequest | CreateSalesRequest[]
) => {
  const salesArray = Array.isArray(salesData) ? salesData : [salesData];

  // Collect all unique IDs for batch validation
  const inventoryItemIds = [
    ...new Set(salesArray.map((sale) => sale.inventoryItemId)),
  ];
  const districtIds = [...new Set(salesArray.map((sale) => sale.districtId))];
  const psrIds = [...new Set(salesArray.map((sale) => sale.psrId))];
  const customerIds = [
    ...new Set(
      salesArray
        .map((sale) => sale.customerId)
        .filter((id): id is number => typeof id === "number")
    ),
  ];

  // Validate all inventory items exist and are active
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: {
      id: { in: inventoryItemIds },
    },
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

  if (inventoryItems.length !== inventoryItemIds.length) {
    const foundIds = inventoryItems.map((item) => item.id);
    const missingIds = inventoryItemIds.filter((id) => !foundIds.includes(id));
    throw new Error(`Inventory items not found: ${missingIds.join(", ")}`);
  }

  // Validate all districts exist and are active
  const districts = await prisma.district.findMany({
    where: {
      id: { in: districtIds },
      isActive: true,
    },
  });

  if (districts.length !== districtIds.length) {
    const foundIds = districts.map((district) => district.id);
    const missingIds = districtIds.filter((id) => !foundIds.includes(id));
    throw new Error(
      `Districts not found or inactive: ${missingIds.join(", ")}`
    );
  }

  // Validate all PSRs exist and are active
  const psrs = await prisma.pSR.findMany({
    where: {
      id: { in: psrIds },
      isActive: true,
      status: "ACTIVE",
    },
  });

  if (psrs.length !== psrIds.length) {
    const foundIds = psrs.map((psr) => psr.id);
    const missingIds = psrIds.filter((id) => !foundIds.includes(id));
    throw new Error(`PSRs not found or inactive: ${missingIds.join(", ")}`);
  }

  // Validate customers if provided
  if (customerIds.length > 0) {
    const customers = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        isActive: true,
      },
    });

    if (customers.length !== customerIds.length) {
      const foundIds = customers.map((customer) => customer.id);
      const missingIds = customerIds.filter((id) => !foundIds.includes(id));
      throw new Error(
        `Customers not found or inactive: ${missingIds.join(", ")}`
      );
    }
  }

  // Validate inventory availability for each sale individually
  salesArray.forEach((sale, index) => {
    const prefix = salesArray.length > 1 ? `Sale ${index + 1}: ` : "";
    const inventoryItem = inventoryItems.find(
      (item) => item.id === sale.inventoryItemId
    );

    if (!inventoryItem) {
      throw new Error(`${prefix}Inventory item not found`);
    }

    // Check if inventory item is active
    if (inventoryItem.status !== "ACTIVE") {
      throw new Error(
        `${prefix}Inventory item is not active. Status: ${inventoryItem.status}`
      );
    }

    // Check if product is active
    if (!inventoryItem.product || !inventoryItem.product.isActive) {
      throw new Error(`${prefix}Product is not active`);
    }

    // Check if batch is not expired
    if (inventoryItem.batch.expiryDate < new Date()) {
      throw new Error(
        `${prefix}Cannot sell expired products. Batch expired on ${inventoryItem.batch.expiryDate.toDateString()}`
      );
    }

    // Check individual stock availability
    if (inventoryItem.currentQuantity < sale.quantity) {
      throw new Error(
        `${prefix}Insufficient stock. Available: ${inventoryItem.currentQuantity}, Requested: ${sale.quantity}`
      );
    }

    // Note: Cumulative inventory validation for multiple sales targeting the same item
    // is handled within the transaction in create_bulk.service.ts to prevent race conditions

    // Validate discount doesn't exceed item value
    const itemValue = inventoryItem.retailPrice.mul(sale.quantity);
    const discount = new Decimal(sale.unitDiscount || 0);
    if (discount.gte(itemValue)) {
      throw new Error(
        `${prefix}Discount cannot be greater than or equal to item value`
      );
    }

    // Validate amount paid doesn't exceed final price (with some tolerance for overpayment)
    const finalPrice = itemValue.minus(discount);
    const amountPaid = new Decimal(sale.amountPaid || 0);
    const maxAllowedPayment = finalPrice.mul(1.1); // Allow 10% overpayment

    if (amountPaid.gt(maxAllowedPayment)) {
      throw new Error(
        `${prefix}Amount paid cannot exceed 110% of the final price`
      );
    }

    // Validate that balance will not be negative
    const balance = finalPrice.minus(amountPaid);
    if (balance.lt(0)) {
      throw new Error(
        `${prefix}Amount paid cannot exceed the final price. Balance cannot be negative`
      );
    }
  });
};

/**
 * Validates for duplicate requests within the same batch
 */
export const validateDuplicatesInBatch = (salesData: CreateSalesRequest[]) => {
  if (salesData.length <= 1) return;

  const signatures = new Map<string, number>();

  salesData.forEach((sale, index) => {
    // Create a signature for each sale to detect duplicates
    const signature = JSON.stringify({
      inventoryItemId: sale.inventoryItemId,
      customerId: sale.customerId,
      customerName: sale.customerName?.trim().toLowerCase(),
      quantity: sale.quantity,
      unitDiscount: sale.unitDiscount || 0,
      paymentTerms: sale.paymentTerms || "CASH",
      paymentMethod: sale.paymentMethod || "CASH",
      amountPaid: sale.amountPaid || 0,
    });

    if (signatures.has(signature)) {
      throw new Error(
        `Duplicate sale detected at positions ${
          signatures.get(signature)! + 1
        } and ${index + 1}`
      );
    }

    signatures.set(signature, index);
  });
};

/**
 * Main validation function that orchestrates all validations
 */
export const validateSalesData = async (
  salesData: CreateSalesRequest | CreateSalesRequest[],
  context: CreateSalesContext
) => {
  // Step 1: Validate context
  validateContext(context);
  // Step 2: Validate basic types and formats
  validateBasicTypes(salesData);
  // Step 3: Validate numeric ranges
  validateNumericRanges(salesData);
  // Step 4: Validate enums and business rules
  validateEnumsAndBusinessRules(salesData);
  // Step 5: Validate string formats
  validateStringFormats(salesData);
  // Step 6: Validate for duplicates in batch (only for arrays)
  if (Array.isArray(salesData)) {
    validateDuplicatesInBatch(salesData);
  }
  // Step 7: Validate database constraints (async)
  await validateDatabaseConstraints(salesData);

  // If all validations pass, return true
  return true;
};

/**
 * Validation helper for checking if a user has permission to create sales
 */
export const validateUserPermissions = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      stores: true,
      position: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.isActive) {
    throw new Error("User account is inactive");
  }

  // Check if user role allows sales creation
  const allowedRoles = ["SUPERADMIN", "ADMIN", "PHARMACIST", "CASHIER"];
  if (!allowedRoles.includes(user.role.name)) {
    throw new Error(
      `User role ${user.role.name} is not authorized to create sales`
    );
  }

  // Check if user is assigned to any stores
  if (user.stores.length === 0) {
    throw new Error("User is not assigned to any stores");
  }

  return user;
};

/**
 * Sanitizes and normalizes sales data
 */
export const sanitizeSalesData = (
  salesData: CreateSalesRequest | CreateSalesRequest[]
): CreateSalesRequest | CreateSalesRequest[] => {
  const sanitizeItem = (sale: CreateSalesRequest): CreateSalesRequest => {
    return {
      ...sale,
      customerName: sale.customerName?.trim(),
      classification: sale.classification?.trim().toUpperCase(),
      invoiceNumber: sale.invoiceNumber?.trim(),
      documentType: sale.documentType?.trim(),
      transactionGroup: sale.transactionGroup?.trim(),
      notes: sale.notes?.trim(),
      areaCode: sale.areaCode?.trim(),
      unitDiscount: sale.unitDiscount || 0,
      amountPaid: sale.amountPaid || 0,
      paymentTerms: sale.paymentTerms || "CASH",
      paymentMethod: sale.paymentMethod || "CASH",
    };
  };

  return Array.isArray(salesData)
    ? salesData.map(sanitizeItem)
    : sanitizeItem(salesData);
};
