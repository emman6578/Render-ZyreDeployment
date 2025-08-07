-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fullname` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `isEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    `resetToken` VARCHAR(191) NULL,
    `resetTokenExpiry` DATETIME(3) NULL,
    `lastLogin` DATETIME(3) NULL,
    `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated` DATETIME(3) NOT NULL,
    `roleId` INTEGER NOT NULL,
    `positionId` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_resetToken_key`(`resetToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Store` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Position` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Position_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,
    `csrfToken` VARCHAR(191) NULL,
    `csrfTokenExpiresAt` DATETIME(3) NULL,
    `userId` INTEGER NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `image` VARCHAR(191) NULL,
    `genericId` INTEGER NOT NULL,
    `brandId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `safetyStock` INTEGER NOT NULL DEFAULT 0,
    `averageCostPrice` DECIMAL(10, 2) NOT NULL,
    `averageRetailPrice` DECIMAL(10, 2) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastUpdateReason` VARCHAR(191) NULL,

    INDEX `products_companyId_idx`(`companyId`),
    INDEX `products_brandId_idx`(`brandId`),
    INDEX `products_isActive_idx`(`isActive`),
    INDEX `products_createdById_idx`(`createdById`),
    INDEX `products_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `companies_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `brands_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `generics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `generics_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `suppliers_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `districts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `districts_name_key`(`name`),
    UNIQUE INDEX `districts_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_price_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `previousCostPrice` DECIMAL(10, 2) NULL,
    `previousRetailPrice` DECIMAL(10, 2) NULL,
    `averageCostPrice` DECIMAL(10, 2) NOT NULL,
    `averageRetailPrice` DECIMAL(10, 2) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `effectiveDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reason` VARCHAR(191) NULL,

    INDEX `product_price_history_productId_idx`(`productId`),
    INDEX `product_price_history_effectiveDate_idx`(`effectiveDate`),
    INDEX `product_price_history_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referenceNumber` VARCHAR(191) NOT NULL,
    `batchNumber` VARCHAR(191) NOT NULL,
    `supplierId` INTEGER NOT NULL,
    `districtId` INTEGER NOT NULL,
    `dt` VARCHAR(191) NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `invoiceDate` DATETIME(3) NOT NULL,
    `expiryDate` DATETIME(3) NOT NULL,
    `manufacturingDate` DATETIME(3) NULL,
    `createdById` INTEGER NOT NULL,
    `updatedById` INTEGER NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'DAMAGED', 'RECALLED', 'SOLD_OUT') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `receivedBy` VARCHAR(191) NULL,
    `verifiedBy` VARCHAR(191) NULL,
    `verificationDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `inventory_batches_referenceNumber_key`(`referenceNumber`),
    INDEX `inventory_batches_supplierId_idx`(`supplierId`),
    INDEX `inventory_batches_districtId_idx`(`districtId`),
    INDEX `inventory_batches_expiryDate_idx`(`expiryDate`),
    INDEX `inventory_batches_batchNumber_idx`(`batchNumber`),
    INDEX `inventory_batches_status_idx`(`status`),
    INDEX `inventory_batches_createdById_idx`(`createdById`),
    INDEX `inventory_batches_updatedById_idx`(`updatedById`),
    UNIQUE INDEX `inventory_batches_supplierId_batchNumber_key`(`supplierId`, `batchNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batchId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `initialQuantity` INTEGER NOT NULL,
    `currentQuantity` INTEGER NOT NULL,
    `costPrice` DECIMAL(10, 2) NOT NULL,
    `retailPrice` DECIMAL(10, 2) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `updatedById` INTEGER NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'DAMAGED', 'RECALLED', 'SOLD_OUT') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastUpdateReason` VARCHAR(191) NULL,

    INDEX `inventory_items_batchId_idx`(`batchId`),
    INDEX `inventory_items_productId_idx`(`productId`),
    INDEX `inventory_items_status_idx`(`status`),
    INDEX `inventory_items_createdById_idx`(`createdById`),
    INDEX `inventory_items_updatedById_idx`(`updatedById`),
    UNIQUE INDEX `inventory_items_batchId_productId_key`(`batchId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryItemId` INTEGER NOT NULL,
    `movementType` ENUM('INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'EXPIRED') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,
    `referenceId` VARCHAR(191) NULL,
    `createdById` INTEGER NOT NULL,
    `previousQuantity` INTEGER NOT NULL,
    `newQuantity` INTEGER NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvalDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,

    INDEX `inventory_movements_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `inventory_movements_movementType_idx`(`movementType`),
    INDEX `inventory_movements_createdAt_idx`(`createdAt`),
    INDEX `inventory_movements_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_price_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryItemId` INTEGER NOT NULL,
    `previousCostPrice` DECIMAL(10, 2) NULL,
    `previousRetailPrice` DECIMAL(10, 2) NULL,
    `averageCostPrice` DECIMAL(10, 2) NOT NULL,
    `averageRetailPrice` DECIMAL(10, 2) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `effectiveDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reason` VARCHAR(191) NULL,

    INDEX `inventory_price_history_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `inventory_price_history_effectiveDate_idx`(`effectiveDate`),
    INDEX `inventory_price_history_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referenceNumber` VARCHAR(191) NOT NULL,
    `batchNumber` VARCHAR(191) NOT NULL,
    `supplierId` INTEGER NOT NULL,
    `districtId` INTEGER NOT NULL,
    `dt` VARCHAR(191) NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `invoiceDate` DATETIME(3) NOT NULL,
    `expiryDate` DATETIME(3) NOT NULL,
    `manufacturingDate` DATETIME(3) NULL,
    `createdById` INTEGER NOT NULL,
    `updatedById` INTEGER NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'DAMAGED', 'RETURNED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `receivedBy` VARCHAR(191) NULL,
    `verifiedBy` VARCHAR(191) NULL,
    `verificationDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `purchases_referenceNumber_key`(`referenceNumber`),
    INDEX `purchases_supplierId_idx`(`supplierId`),
    INDEX `purchases_districtId_idx`(`districtId`),
    INDEX `purchases_expiryDate_idx`(`expiryDate`),
    INDEX `purchases_batchNumber_idx`(`batchNumber`),
    INDEX `purchases_status_idx`(`status`),
    INDEX `purchases_createdById_idx`(`createdById`),
    INDEX `purchases_updatedById_idx`(`updatedById`),
    UNIQUE INDEX `purchases_supplierId_batchNumber_key`(`supplierId`, `batchNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batchId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `initialQuantity` INTEGER NOT NULL,
    `currentQuantity` INTEGER NOT NULL,
    `costPrice` DECIMAL(10, 2) NOT NULL,
    `retailPrice` DECIMAL(10, 2) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `updatedById` INTEGER NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'DAMAGED', 'RETURNED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastUpdateReason` VARCHAR(191) NULL,

    INDEX `purchase_items_batchId_idx`(`batchId`),
    INDEX `purchase_items_productId_idx`(`productId`),
    INDEX `purchase_items_status_idx`(`status`),
    INDEX `purchase_items_createdById_idx`(`createdById`),
    INDEX `purchase_items_updatedById_idx`(`updatedById`),
    UNIQUE INDEX `purchase_items_batchId_productId_key`(`batchId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_edits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `editType` ENUM('PURCHASE', 'PURCHASE_ITEM') NOT NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `purchaseId` INTEGER NULL,
    `purchaseItemId` INTEGER NULL,
    `batchNumber` VARCHAR(191) NULL,
    `genericName` VARCHAR(191) NULL,
    `brandName` VARCHAR(191) NULL,
    `action` ENUM('INSERT', 'UPDATE', 'DELETE', 'RESTORE') NOT NULL,
    `changedFields` JSON NOT NULL,
    `reason` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `editedById` INTEGER NOT NULL,
    `editedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `purchase_edits_purchaseId_idx`(`purchaseId`),
    INDEX `purchase_edits_purchaseItemId_idx`(`purchaseItemId`),
    INDEX `purchase_edits_editType_idx`(`editType`),
    INDEX `purchase_edits_action_idx`(`action`),
    INDEX `purchase_edits_editedById_idx`(`editedById`),
    INDEX `purchase_edits_editedAt_idx`(`editedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_returns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referenceNumber` VARCHAR(191) NOT NULL,
    `originalPurchaseId` INTEGER NOT NULL,
    `originalPurchaseItemId` INTEGER NOT NULL,
    `returnQuantity` INTEGER NOT NULL,
    `returnPrice` DECIMAL(10, 2) NOT NULL,
    `returnReason` VARCHAR(191) NOT NULL,
    `returnDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedById` INTEGER NOT NULL,
    `approvedById` INTEGER NULL,
    `status` ENUM('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `refundAmount` DECIMAL(10, 2) NULL,

    UNIQUE INDEX `purchase_returns_referenceNumber_key`(`referenceNumber`),
    INDEX `purchase_returns_originalPurchaseId_idx`(`originalPurchaseId`),
    INDEX `purchase_returns_originalPurchaseItemId_idx`(`originalPurchaseItemId`),
    INDEX `purchase_returns_returnDate_idx`(`returnDate`),
    INDEX `purchase_returns_status_idx`(`status`),
    INDEX `purchase_returns_processedById_idx`(`processedById`),
    INDEX `purchase_returns_approvedById_idx`(`approvedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `recordId` INTEGER NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'EXPORT') NOT NULL,
    `description` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_userId_idx`(`userId`),
    INDEX `activity_logs_model_idx`(`model`),
    INDEX `activity_logs_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referenceNumber` VARCHAR(191) NULL,
    `productId` INTEGER NOT NULL,
    `transactionType` ENUM('PURCHASE_RECEIVED', 'INVENTORY_ADJUSTMENT', 'SALE', 'RETURN_TO_SUPPLIER', 'SALES_RETURN', 'PRICE_UPDATE_PRODUCT', 'PRICE_UPDATE_INVENTORY', 'INVENTORY_TRANSFER', 'MANUAL_EDIT', 'PURCHASE_EDIT', 'INVENTORY_ADDED', 'EXPIRED', 'LOW_STOCK') NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `quantityIn` INTEGER NULL,
    `quantityOut` INTEGER NULL,
    `costPrice` DECIMAL(10, 2) NULL,
    `retailPrice` DECIMAL(10, 2) NULL,
    `userId` INTEGER NOT NULL,
    `sourceModel` VARCHAR(191) NOT NULL,
    `sourceId` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_transactions_productId_idx`(`productId`),
    INDEX `product_transactions_transactionType_idx`(`transactionType`),
    INDEX `product_transactions_transactionDate_idx`(`transactionDate`),
    INDEX `product_transactions_userId_idx`(`userId`),
    INDEX `product_transactions_sourceModel_sourceId_idx`(`sourceModel`, `sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionID` VARCHAR(191) NOT NULL,
    `requestHash` VARCHAR(191) NULL,
    `inventoryItemId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `genericName` VARCHAR(191) NOT NULL,
    `brandName` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `batchNumber` VARCHAR(191) NOT NULL,
    `expiryDate` DATETIME(3) NOT NULL,
    `supplierName` VARCHAR(191) NOT NULL,
    `customerId` INTEGER NULL,
    `customerName` VARCHAR(191) NULL,
    `districtId` INTEGER NOT NULL,
    `areaCode` VARCHAR(191) NULL,
    `psrId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitCostPrice` DECIMAL(10, 2) NOT NULL,
    `unitRetailPrice` DECIMAL(10, 2) NOT NULL,
    `unitDiscount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `unitFinalPrice` DECIMAL(10, 2) NOT NULL,
    `paymentTerms` ENUM('CASH', 'CREDIT_30', 'CREDIT_60', 'CREDIT_90') NOT NULL DEFAULT 'CASH',
    `paymentMethod` ENUM('CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'GCASH', 'PAYMAYA') NOT NULL DEFAULT 'CASH',
    `amountPaid` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `dueDate` DATETIME(3) NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `documentType` VARCHAR(191) NULL,
    `transactionGroup` VARCHAR(191) NULL,
    `saleDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pulloutDate` DATETIME(3) NULL,
    `createdById` INTEGER NOT NULL,
    `updatedById` INTEGER NULL,
    `status` ENUM('ACTIVE', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'VOID') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` VARCHAR(191) NULL,

    UNIQUE INDEX `sales_transactionID_key`(`transactionID`),
    UNIQUE INDEX `sales_requestHash_key`(`requestHash`),
    INDEX `sales_requestHash_idx`(`requestHash`),
    INDEX `sales_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `sales_productId_idx`(`productId`),
    INDEX `sales_customerId_idx`(`customerId`),
    INDEX `sales_districtId_idx`(`districtId`),
    INDEX `sales_psrId_idx`(`psrId`),
    INDEX `sales_saleDate_idx`(`saleDate`),
    INDEX `sales_status_idx`(`status`),
    INDEX `sales_createdById_idx`(`createdById`),
    INDEX `sales_updatedById_idx`(`updatedById`),
    INDEX `sales_paymentTerms_idx`(`paymentTerms`),
    INDEX `sales_transactionGroup_idx`(`transactionGroup`),
    INDEX `sales_batchNumber_idx`(`batchNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionID` VARCHAR(191) NOT NULL,
    `collectionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `customerName` VARCHAR(191) NOT NULL,
    `deliveryReference` VARCHAR(191) NULL,
    `saleDate` DATETIME(3) NULL,
    `areaCode` VARCHAR(191) NULL,
    `psrId` INTEGER NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `pricePerUnit` DECIMAL(10, 2) NOT NULL,
    `invoiceAmount` DECIMAL(10, 2) NOT NULL,
    `paymentDetails` VARCHAR(191) NULL,
    `checkDate` DATETIME(3) NULL,
    `paymentAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `creditableWithholdingTax` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `serviceChargeOtherDeductions` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `excessPenalty` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `depositDate` DATETIME(3) NULL,
    `amountPerDepositSlip` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `salesGross` DECIMAL(10, 2) NOT NULL,
    `netAmount` DECIMAL(10, 2) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `updatedById` INTEGER NULL,
    `status` ENUM('PENDING', 'COLLECTED', 'DEPOSITED', 'RECONCILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `notes` VARCHAR(191) NULL,

    UNIQUE INDEX `collections_transactionID_key`(`transactionID`),
    INDEX `collections_transactionID_idx`(`transactionID`),
    INDEX `collections_psrId_idx`(`psrId`),
    INDEX `collections_collectionDate_idx`(`collectionDate`),
    INDEX `collections_status_idx`(`status`),
    INDEX `collections_createdById_idx`(`createdById`),
    INDEX `collections_updatedById_idx`(`updatedById`),
    INDEX `collections_areaCode_idx`(`areaCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerName` VARCHAR(191) NOT NULL,
    `customerType` ENUM('WALK_IN', 'REGULAR', 'WHOLESALE', 'GOVERNMENT', 'HOSPITAL', 'CLINIC', 'PHARMACY') NOT NULL DEFAULT 'WALK_IN',
    `contactPerson` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `emailAddress` VARCHAR(191) NULL,
    `creditLimit` DECIMAL(10, 2) NULL,
    `creditTerms` ENUM('CASH', 'CREDIT_30', 'CREDIT_60', 'CREDIT_90') NOT NULL DEFAULT 'CASH',
    `createdById` INTEGER NOT NULL,
    `updatedById` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customers_customerType_idx`(`customerType`),
    INDEX `customers_createdById_idx`(`createdById`),
    INDEX `customers_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `paymentMethod` ENUM('CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'GCASH', 'PAYMAYA') NOT NULL,
    `paymentAmount` DECIMAL(10, 2) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `referenceNumber` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `checkDate` DATETIME(3) NULL,
    `receivedById` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `notes` VARCHAR(191) NULL,

    INDEX `sales_payments_saleId_idx`(`saleId`),
    INDEX `sales_payments_paymentMethod_idx`(`paymentMethod`),
    INDEX `sales_payments_paymentDate_idx`(`paymentDate`),
    INDEX `sales_payments_status_idx`(`status`),
    INDEX `sales_payments_receivedById_idx`(`receivedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_returns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionID` VARCHAR(191) NOT NULL,
    `originalSaleId` INTEGER NOT NULL,
    `returnQuantity` INTEGER NOT NULL,
    `returnPrice` DECIMAL(10, 2) NOT NULL,
    `returnReason` VARCHAR(191) NOT NULL,
    `returnDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedById` INTEGER NOT NULL,
    `approvedById` INTEGER NULL,
    `status` ENUM('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `refundAmount` DECIMAL(10, 2) NULL,
    `restockable` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `sales_returns_transactionID_key`(`transactionID`),
    INDEX `sales_returns_originalSaleId_idx`(`originalSaleId`),
    INDEX `sales_returns_returnDate_idx`(`returnDate`),
    INDEX `sales_returns_status_idx`(`status`),
    INDEX `sales_returns_processedById_idx`(`processedById`),
    INDEX `sales_returns_approvedById_idx`(`approvedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `psrs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `psrCode` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `areaCode` VARCHAR(191) NULL,
    `sourceHash` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE') NOT NULL DEFAULT 'ACTIVE',
    `createdById` INTEGER NOT NULL,
    `updatedById` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `psrs_psrCode_key`(`psrCode`),
    INDEX `psrs_psrCode_idx`(`psrCode`),
    INDEX `psrs_status_idx`(`status`),
    INDEX `psrs_createdById_idx`(`createdById`),
    INDEX `psrs_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_StoreToUser` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_StoreToUser_AB_unique`(`A`, `B`),
    INDEX `_StoreToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CategoryToProduct` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CategoryToProduct_AB_unique`(`A`, `B`),
    INDEX `_CategoryToProduct_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `Position`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_genericId_fkey` FOREIGN KEY (`genericId`) REFERENCES `generics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_price_history` ADD CONSTRAINT `product_price_history_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_price_history` ADD CONSTRAINT `product_price_history_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `inventory_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_price_history` ADD CONSTRAINT `inventory_price_history_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_price_history` ADD CONSTRAINT `inventory_price_history_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_edits` ADD CONSTRAINT `purchase_edits_editedById_fkey` FOREIGN KEY (`editedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_originalPurchaseId_fkey` FOREIGN KEY (`originalPurchaseId`) REFERENCES `purchases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_originalPurchaseItemId_fkey` FOREIGN KEY (`originalPurchaseItemId`) REFERENCES `purchase_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_processedById_fkey` FOREIGN KEY (`processedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_transactions` ADD CONSTRAINT `product_transactions_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_transactions` ADD CONSTRAINT `product_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_psrId_fkey` FOREIGN KEY (`psrId`) REFERENCES `psrs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collections` ADD CONSTRAINT `collections_psrId_fkey` FOREIGN KEY (`psrId`) REFERENCES `psrs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collections` ADD CONSTRAINT `collections_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collections` ADD CONSTRAINT `collections_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_payments` ADD CONSTRAINT `sales_payments_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_payments` ADD CONSTRAINT `sales_payments_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_returns` ADD CONSTRAINT `sales_returns_originalSaleId_fkey` FOREIGN KEY (`originalSaleId`) REFERENCES `sales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_returns` ADD CONSTRAINT `sales_returns_processedById_fkey` FOREIGN KEY (`processedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_returns` ADD CONSTRAINT `sales_returns_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `psrs` ADD CONSTRAINT `psrs_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `psrs` ADD CONSTRAINT `psrs_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_StoreToUser` ADD CONSTRAINT `_StoreToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_StoreToUser` ADD CONSTRAINT `_StoreToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CategoryToProduct` ADD CONSTRAINT `_CategoryToProduct_A_fkey` FOREIGN KEY (`A`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CategoryToProduct` ADD CONSTRAINT `_CategoryToProduct_B_fkey` FOREIGN KEY (`B`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
