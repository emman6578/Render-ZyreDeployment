-- CreateEnum
CREATE TYPE "purchase_status" AS ENUM ('ACTIVE', 'EXPIRED', 'DAMAGED', 'RETURNED');

-- CreateEnum
CREATE TYPE "inventory_status" AS ENUM ('ACTIVE', 'EXPIRED', 'DAMAGED', 'RECALLED', 'SOLD_OUT');

-- CreateEnum
CREATE TYPE "movement_type" AS ENUM ('INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'EXPORT');

-- CreateEnum
CREATE TYPE "purchase_edit_type" AS ENUM ('PURCHASE', 'PURCHASE_ITEM');

-- CreateEnum
CREATE TYPE "edit_action" AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'RESTORE');

-- CreateEnum
CREATE TYPE "purchase_return_status" AS ENUM ('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductTransactionType" AS ENUM ('PURCHASE_RECEIVED', 'INVENTORY_ADJUSTMENT', 'SALE', 'RETURN_TO_SUPPLIER', 'SALES_RETURN', 'PRICE_UPDATE_PRODUCT', 'PRICE_UPDATE_INVENTORY', 'INVENTORY_TRANSFER', 'MANUAL_EDIT', 'PURCHASE_EDIT', 'INVENTORY_ADDED', 'EXPIRED', 'LOW_STOCK');

-- CreateEnum
CREATE TYPE "sales_status" AS ENUM ('ACTIVE', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'VOID');

-- CreateEnum
CREATE TYPE "sales_item_status" AS ENUM ('ACTIVE', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED');

-- CreateEnum
CREATE TYPE "customer_type" AS ENUM ('WALK_IN', 'REGULAR', 'WHOLESALE', 'GOVERNMENT', 'HOSPITAL', 'CLINIC', 'PHARMACY');

-- CreateEnum
CREATE TYPE "payment_terms" AS ENUM ('CASH', 'CREDIT_30', 'CREDIT_60', 'CREDIT_90');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'GCASH', 'PAYMAYA');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "sales_return_status" AS ENUM ('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "psr_status" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "collection_status" AS ENUM ('PENDING', 'COLLECTED', 'DEPOSITED', 'RECONCILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "recordId" INTEGER,
    "action" "ActionType" NOT NULL,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" SERIAL NOT NULL,
    "transactionID" TEXT NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerName" TEXT NOT NULL,
    "deliveryReference" TEXT,
    "saleDate" TIMESTAMP(3),
    "areaCode" TEXT,
    "psrId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "invoiceAmount" DECIMAL(10,2) NOT NULL,
    "paymentDetails" TEXT,
    "checkDate" TIMESTAMP(3),
    "paymentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "creditableWithholdingTax" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "serviceChargeOtherDeductions" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "excessPenalty" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "depositDate" TIMESTAMP(3),
    "amountPerDepositSlip" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "salesGross" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "status" "collection_status" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generics" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "generics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" SERIAL NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "districtId" INTEGER NOT NULL,
    "dt" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "manufacturingDate" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "status" "inventory_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "receivedBy" TEXT,
    "verifiedBy" TEXT,
    "verificationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "initialQuantity" INTEGER NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "retailPrice" DECIMAL(10,2) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "status" "inventory_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUpdateReason" TEXT,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" SERIAL NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "movementType" "movement_type" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceId" TEXT,
    "createdById" INTEGER NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_price_history" (
    "id" SERIAL NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "previousCostPrice" DECIMAL(10,2),
    "previousRetailPrice" DECIMAL(10,2),
    "averageCostPrice" DECIMAL(10,2) NOT NULL,
    "averageRetailPrice" DECIMAL(10,2) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "inventory_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "image" TEXT,
    "genericId" INTEGER NOT NULL,
    "brandId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "safetyStock" INTEGER NOT NULL DEFAULT 0,
    "averageCostPrice" DECIMAL(10,2) NOT NULL,
    "averageRetailPrice" DECIMAL(10,2) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdateReason" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price_history" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "previousCostPrice" DECIMAL(10,2),
    "previousRetailPrice" DECIMAL(10,2),
    "averageCostPrice" DECIMAL(10,2) NOT NULL,
    "averageRetailPrice" DECIMAL(10,2) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "product_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_transactions" (
    "id" SERIAL NOT NULL,
    "referenceNumber" TEXT,
    "productId" INTEGER NOT NULL,
    "transactionType" "ProductTransactionType" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantityIn" INTEGER,
    "quantityOut" INTEGER,
    "costPrice" DECIMAL(10,2),
    "retailPrice" DECIMAL(10,2),
    "userId" INTEGER NOT NULL,
    "sourceModel" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psrs" (
    "id" SERIAL NOT NULL,
    "psrCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "areaCode" TEXT,
    "sourceHash" TEXT,
    "status" "psr_status" NOT NULL DEFAULT 'ACTIVE',
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "psrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" SERIAL NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "districtId" INTEGER NOT NULL,
    "dt" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "manufacturingDate" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "status" "purchase_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "receivedBy" TEXT,
    "verifiedBy" TEXT,
    "verificationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_edits" (
    "id" SERIAL NOT NULL,
    "editType" "purchase_edit_type" NOT NULL,
    "referenceNumber" TEXT,
    "purchaseId" INTEGER,
    "purchaseItemId" INTEGER,
    "batchNumber" TEXT,
    "genericName" TEXT,
    "brandName" TEXT,
    "action" "edit_action" NOT NULL,
    "changedFields" JSONB NOT NULL,
    "reason" TEXT,
    "description" TEXT,
    "editedById" INTEGER NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "initialQuantity" INTEGER NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "retailPrice" DECIMAL(10,2) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "status" "purchase_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUpdateReason" TEXT,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_returns" (
    "id" SERIAL NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "originalPurchaseId" INTEGER NOT NULL,
    "originalPurchaseItemId" INTEGER NOT NULL,
    "returnQuantity" INTEGER NOT NULL,
    "returnPrice" DECIMAL(10,2) NOT NULL,
    "returnReason" TEXT NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedById" INTEGER NOT NULL,
    "approvedById" INTEGER,
    "status" "purchase_return_status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "refundAmount" DECIMAL(10,2),

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" SERIAL NOT NULL,
    "transactionID" TEXT NOT NULL,
    "requestHash" TEXT,
    "inventoryItemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "genericName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "supplierName" TEXT NOT NULL,
    "customerId" INTEGER,
    "customerName" TEXT,
    "classification" TEXT,
    "districtId" INTEGER NOT NULL,
    "areaCode" TEXT,
    "psrId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostPrice" DECIMAL(10,2) NOT NULL,
    "unitRetailPrice" DECIMAL(10,2) NOT NULL,
    "unitDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "unitFinalPrice" DECIMAL(10,2) NOT NULL,
    "paymentTerms" "payment_terms" NOT NULL DEFAULT 'CASH',
    "paymentMethod" "payment_method" NOT NULL DEFAULT 'CASH',
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "dueDate" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "documentType" TEXT,
    "transactionGroup" TEXT,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pulloutDate" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "status" "sales_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_payments" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "paymentMethod" "payment_method" NOT NULL,
    "paymentAmount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNumber" TEXT,
    "bankName" TEXT,
    "checkDate" TIMESTAMP(3),
    "receivedById" INTEGER NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "sales_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_returns" (
    "id" SERIAL NOT NULL,
    "transactionID" TEXT NOT NULL,
    "originalSaleId" INTEGER NOT NULL,
    "returnQuantity" INTEGER NOT NULL,
    "returnPrice" DECIMAL(10,2) NOT NULL,
    "returnReason" TEXT NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedById" INTEGER NOT NULL,
    "approvedById" INTEGER,
    "status" "sales_return_status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "refundAmount" DECIMAL(10,2),
    "restockable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "csrfToken" TEXT,
    "csrfTokenExpiresAt" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tin_id" TEXT,
    "contact" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,
    "roleId" INTEGER NOT NULL,
    "positionId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CategoryToProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StoreToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_StoreToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_model_idx" ON "activity_logs"("model");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "collections_transactionID_key" ON "collections"("transactionID");

-- CreateIndex
CREATE INDEX "collections_transactionID_idx" ON "collections"("transactionID");

-- CreateIndex
CREATE INDEX "collections_psrId_idx" ON "collections"("psrId");

-- CreateIndex
CREATE INDEX "collections_collectionDate_idx" ON "collections"("collectionDate");

-- CreateIndex
CREATE INDEX "collections_status_idx" ON "collections"("status");

-- CreateIndex
CREATE INDEX "collections_createdById_idx" ON "collections"("createdById");

-- CreateIndex
CREATE INDEX "collections_updatedById_idx" ON "collections"("updatedById");

-- CreateIndex
CREATE INDEX "collections_areaCode_idx" ON "collections"("areaCode");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE INDEX "customers_createdById_idx" ON "customers"("createdById");

-- CreateIndex
CREATE INDEX "customers_updatedById_idx" ON "customers"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_key" ON "districts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "generics_name_key" ON "generics"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_batches_referenceNumber_key" ON "inventory_batches"("referenceNumber");

-- CreateIndex
CREATE INDEX "inventory_batches_supplierId_idx" ON "inventory_batches"("supplierId");

-- CreateIndex
CREATE INDEX "inventory_batches_districtId_idx" ON "inventory_batches"("districtId");

-- CreateIndex
CREATE INDEX "inventory_batches_expiryDate_idx" ON "inventory_batches"("expiryDate");

-- CreateIndex
CREATE INDEX "inventory_batches_batchNumber_idx" ON "inventory_batches"("batchNumber");

-- CreateIndex
CREATE INDEX "inventory_batches_status_idx" ON "inventory_batches"("status");

-- CreateIndex
CREATE INDEX "inventory_batches_createdById_idx" ON "inventory_batches"("createdById");

-- CreateIndex
CREATE INDEX "inventory_batches_updatedById_idx" ON "inventory_batches"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_batches_supplierId_batchNumber_key" ON "inventory_batches"("supplierId", "batchNumber");

-- CreateIndex
CREATE INDEX "inventory_items_batchId_idx" ON "inventory_items"("batchId");

-- CreateIndex
CREATE INDEX "inventory_items_productId_idx" ON "inventory_items"("productId");

-- CreateIndex
CREATE INDEX "inventory_items_status_idx" ON "inventory_items"("status");

-- CreateIndex
CREATE INDEX "inventory_items_createdById_idx" ON "inventory_items"("createdById");

-- CreateIndex
CREATE INDEX "inventory_items_updatedById_idx" ON "inventory_items"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_batchId_productId_key" ON "inventory_items"("batchId", "productId");

-- CreateIndex
CREATE INDEX "inventory_movements_inventoryItemId_idx" ON "inventory_movements"("inventoryItemId");

-- CreateIndex
CREATE INDEX "inventory_movements_movementType_idx" ON "inventory_movements"("movementType");

-- CreateIndex
CREATE INDEX "inventory_movements_createdAt_idx" ON "inventory_movements"("createdAt");

-- CreateIndex
CREATE INDEX "inventory_movements_createdById_idx" ON "inventory_movements"("createdById");

-- CreateIndex
CREATE INDEX "inventory_price_history_inventoryItemId_idx" ON "inventory_price_history"("inventoryItemId");

-- CreateIndex
CREATE INDEX "inventory_price_history_effectiveDate_idx" ON "inventory_price_history"("effectiveDate");

-- CreateIndex
CREATE INDEX "inventory_price_history_createdById_idx" ON "inventory_price_history"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");

-- CreateIndex
CREATE INDEX "products_companyId_idx" ON "products"("companyId");

-- CreateIndex
CREATE INDEX "products_brandId_idx" ON "products"("brandId");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "products"("isActive");

-- CreateIndex
CREATE INDEX "products_createdById_idx" ON "products"("createdById");

-- CreateIndex
CREATE INDEX "products_updatedById_idx" ON "products"("updatedById");

-- CreateIndex
CREATE INDEX "product_price_history_productId_idx" ON "product_price_history"("productId");

-- CreateIndex
CREATE INDEX "product_price_history_effectiveDate_idx" ON "product_price_history"("effectiveDate");

-- CreateIndex
CREATE INDEX "product_price_history_createdById_idx" ON "product_price_history"("createdById");

-- CreateIndex
CREATE INDEX "product_transactions_productId_idx" ON "product_transactions"("productId");

-- CreateIndex
CREATE INDEX "product_transactions_transactionType_idx" ON "product_transactions"("transactionType");

-- CreateIndex
CREATE INDEX "product_transactions_transactionDate_idx" ON "product_transactions"("transactionDate");

-- CreateIndex
CREATE INDEX "product_transactions_userId_idx" ON "product_transactions"("userId");

-- CreateIndex
CREATE INDEX "product_transactions_sourceModel_sourceId_idx" ON "product_transactions"("sourceModel", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "psrs_psrCode_key" ON "psrs"("psrCode");

-- CreateIndex
CREATE INDEX "psrs_psrCode_idx" ON "psrs"("psrCode");

-- CreateIndex
CREATE INDEX "psrs_status_idx" ON "psrs"("status");

-- CreateIndex
CREATE INDEX "psrs_createdById_idx" ON "psrs"("createdById");

-- CreateIndex
CREATE INDEX "psrs_updatedById_idx" ON "psrs"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_referenceNumber_key" ON "purchases"("referenceNumber");

-- CreateIndex
CREATE INDEX "purchases_supplierId_idx" ON "purchases"("supplierId");

-- CreateIndex
CREATE INDEX "purchases_districtId_idx" ON "purchases"("districtId");

-- CreateIndex
CREATE INDEX "purchases_expiryDate_idx" ON "purchases"("expiryDate");

-- CreateIndex
CREATE INDEX "purchases_batchNumber_idx" ON "purchases"("batchNumber");

-- CreateIndex
CREATE INDEX "purchases_status_idx" ON "purchases"("status");

-- CreateIndex
CREATE INDEX "purchases_createdById_idx" ON "purchases"("createdById");

-- CreateIndex
CREATE INDEX "purchases_updatedById_idx" ON "purchases"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_supplierId_batchNumber_key" ON "purchases"("supplierId", "batchNumber");

-- CreateIndex
CREATE INDEX "purchase_edits_purchaseId_idx" ON "purchase_edits"("purchaseId");

-- CreateIndex
CREATE INDEX "purchase_edits_purchaseItemId_idx" ON "purchase_edits"("purchaseItemId");

-- CreateIndex
CREATE INDEX "purchase_edits_editType_idx" ON "purchase_edits"("editType");

-- CreateIndex
CREATE INDEX "purchase_edits_action_idx" ON "purchase_edits"("action");

-- CreateIndex
CREATE INDEX "purchase_edits_editedById_idx" ON "purchase_edits"("editedById");

-- CreateIndex
CREATE INDEX "purchase_edits_editedAt_idx" ON "purchase_edits"("editedAt");

-- CreateIndex
CREATE INDEX "purchase_items_batchId_idx" ON "purchase_items"("batchId");

-- CreateIndex
CREATE INDEX "purchase_items_productId_idx" ON "purchase_items"("productId");

-- CreateIndex
CREATE INDEX "purchase_items_status_idx" ON "purchase_items"("status");

-- CreateIndex
CREATE INDEX "purchase_items_createdById_idx" ON "purchase_items"("createdById");

-- CreateIndex
CREATE INDEX "purchase_items_updatedById_idx" ON "purchase_items"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_items_batchId_productId_key" ON "purchase_items"("batchId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_returns_referenceNumber_key" ON "purchase_returns"("referenceNumber");

-- CreateIndex
CREATE INDEX "purchase_returns_originalPurchaseId_idx" ON "purchase_returns"("originalPurchaseId");

-- CreateIndex
CREATE INDEX "purchase_returns_originalPurchaseItemId_idx" ON "purchase_returns"("originalPurchaseItemId");

-- CreateIndex
CREATE INDEX "purchase_returns_returnDate_idx" ON "purchase_returns"("returnDate");

-- CreateIndex
CREATE INDEX "purchase_returns_status_idx" ON "purchase_returns"("status");

-- CreateIndex
CREATE INDEX "purchase_returns_processedById_idx" ON "purchase_returns"("processedById");

-- CreateIndex
CREATE INDEX "purchase_returns_approvedById_idx" ON "purchase_returns"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sales_transactionID_key" ON "sales"("transactionID");

-- CreateIndex
CREATE UNIQUE INDEX "sales_requestHash_key" ON "sales"("requestHash");

-- CreateIndex
CREATE INDEX "sales_requestHash_idx" ON "sales"("requestHash");

-- CreateIndex
CREATE INDEX "sales_inventoryItemId_idx" ON "sales"("inventoryItemId");

-- CreateIndex
CREATE INDEX "sales_productId_idx" ON "sales"("productId");

-- CreateIndex
CREATE INDEX "sales_customerId_idx" ON "sales"("customerId");

-- CreateIndex
CREATE INDEX "sales_districtId_idx" ON "sales"("districtId");

-- CreateIndex
CREATE INDEX "sales_psrId_idx" ON "sales"("psrId");

-- CreateIndex
CREATE INDEX "sales_saleDate_idx" ON "sales"("saleDate");

-- CreateIndex
CREATE INDEX "sales_status_idx" ON "sales"("status");

-- CreateIndex
CREATE INDEX "sales_createdById_idx" ON "sales"("createdById");

-- CreateIndex
CREATE INDEX "sales_updatedById_idx" ON "sales"("updatedById");

-- CreateIndex
CREATE INDEX "sales_paymentTerms_idx" ON "sales"("paymentTerms");

-- CreateIndex
CREATE INDEX "sales_transactionGroup_idx" ON "sales"("transactionGroup");

-- CreateIndex
CREATE INDEX "sales_batchNumber_idx" ON "sales"("batchNumber");

-- CreateIndex
CREATE INDEX "sales_payments_saleId_idx" ON "sales_payments"("saleId");

-- CreateIndex
CREATE INDEX "sales_payments_paymentMethod_idx" ON "sales_payments"("paymentMethod");

-- CreateIndex
CREATE INDEX "sales_payments_paymentDate_idx" ON "sales_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "sales_payments_status_idx" ON "sales_payments"("status");

-- CreateIndex
CREATE INDEX "sales_payments_receivedById_idx" ON "sales_payments"("receivedById");

-- CreateIndex
CREATE UNIQUE INDEX "sales_returns_transactionID_key" ON "sales_returns"("transactionID");

-- CreateIndex
CREATE INDEX "sales_returns_originalSaleId_idx" ON "sales_returns"("originalSaleId");

-- CreateIndex
CREATE INDEX "sales_returns_returnDate_idx" ON "sales_returns"("returnDate");

-- CreateIndex
CREATE INDEX "sales_returns_status_idx" ON "sales_returns"("status");

-- CreateIndex
CREATE INDEX "sales_returns_processedById_idx" ON "sales_returns"("processedById");

-- CreateIndex
CREATE INDEX "sales_returns_approvedById_idx" ON "sales_returns"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE INDEX "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");

-- CreateIndex
CREATE INDEX "_StoreToUser_B_index" ON "_StoreToUser"("B");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_psrId_fkey" FOREIGN KEY ("psrId") REFERENCES "psrs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "inventory_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_price_history" ADD CONSTRAINT "inventory_price_history_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_price_history" ADD CONSTRAINT "inventory_price_history_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_genericId_fkey" FOREIGN KEY ("genericId") REFERENCES "generics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_transactions" ADD CONSTRAINT "product_transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_transactions" ADD CONSTRAINT "product_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psrs" ADD CONSTRAINT "psrs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psrs" ADD CONSTRAINT "psrs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_edits" ADD CONSTRAINT "purchase_edits_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_originalPurchaseId_fkey" FOREIGN KEY ("originalPurchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_originalPurchaseItemId_fkey" FOREIGN KEY ("originalPurchaseItemId") REFERENCES "purchase_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_psrId_fkey" FOREIGN KEY ("psrId") REFERENCES "psrs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_originalSaleId_fkey" FOREIGN KEY ("originalSaleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoreToUser" ADD CONSTRAINT "_StoreToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoreToUser" ADD CONSTRAINT "_StoreToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
