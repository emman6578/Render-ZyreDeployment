import { PrismaClient } from "@prisma/client";

export async function validateCreateInventoryBatchesInput(
  data: any,
  prisma: PrismaClient
) {
  // 1. "batches" must exist, be an array, and have at least one element
  if (!data || !Array.isArray(data.batches) || data.batches.length === 0) {
    throw new Error("Request payload must have a non‐empty 'batches' array.");
  }

  for (const batch of data.batches) {
    // 2a. batchNumber: required, non‐empty string
    if (
      typeof batch.batchNumber !== "string" ||
      batch.batchNumber.trim().length === 0
    ) {
      throw new Error("Each batch must have a non‐empty string 'batchNumber'.");
    }

    // 2b. supplierId & districtId: required, positive integers
    if (
      typeof batch.supplierId !== "number" ||
      !Number.isInteger(batch.supplierId) ||
      batch.supplierId <= 0
    ) {
      throw new Error(
        `Batch ${batch.batchNumber}: 'supplierId' must be a positive integer.`
      );
    } else {
      const supplier = await prisma.supplier.findUnique({
        where: { id: batch.supplierId },
      });
      if (!supplier) {
        throw new Error(
          `Batch ${batch.batchNumber}: Supplier with ID ${batch.supplierId} does not exist.`
        );
      }
    }

    if (
      typeof batch.districtId !== "number" ||
      !Number.isInteger(batch.districtId) ||
      batch.districtId <= 0
    ) {
      throw new Error(
        `Batch ${batch.batchNumber}: 'districtId' must be a positive integer.`
      );
    } else {
      const district = await prisma.district.findUnique({
        where: { id: batch.districtId },
      });
      if (!district) {
        throw new Error(
          `Batch ${batch.batchNumber}: District with ID ${batch.districtId} does not exist.`
        );
      }
    }

    // 2c. invoiceDate & expiryDate: required, valid date strings or Date objects
    const deliveryDate = new Date(batch.invoiceDate);
    const expiryDate = new Date(batch.expiryDate);
    if (isNaN(deliveryDate.getTime())) {
      throw new Error(
        `Batch ${batch.batchNumber}: 'invoiceDate' is not a valid date.`
      );
    }
    if (isNaN(expiryDate.getTime())) {
      throw new Error(
        `Batch ${batch.batchNumber}: 'expiryDate' is not a valid date.`
      );
    }

    // 2d. manufacturingDate, if provided, must be a valid date
    if (batch.manufacturingDate != null) {
      const mfg = new Date(batch.manufacturingDate);
      if (isNaN(mfg.getTime())) {
        throw new Error(
          `Batch ${batch.batchNumber}: 'manufacturingDate' is not a valid date.`
        );
      }
    }

    // 2e. receivedBy / verifiedBy / verificationDate - optional
    if (batch.verificationDate != null) {
      const vDate = new Date(batch.verificationDate);
      if (isNaN(vDate.getTime())) {
        throw new Error(
          `Batch ${batch.batchNumber}: 'verificationDate' is not a valid date.`
        );
      }
    }

    // 3a. Ensure items exist and is a non‐empty array
    if (!Array.isArray(batch.items) || batch.items.length === 0) {
      throw new Error(
        `Batch ${batch.batchNumber} must have at least one element in 'items'.`
      );
    }

    // Check for duplicate productIds within the current batch's items
    const productIdsInBatch = new Set<number>();

    for (const item of batch.items) {
      // 3b. productId: required, positive integer
      if (
        typeof item.productId !== "number" ||
        !Number.isInteger(item.productId) ||
        item.productId <= 0
      ) {
        throw new Error(
          `Batch ${batch.batchNumber}: each item must have a positive integer 'productId'.`
        );
      } else {
        // Check for duplicate productId
        if (productIdsInBatch.has(item.productId)) {
          throw new Error(
            `Batch ${batch.batchNumber}: Duplicate productId ${item.productId} found in items. Each product can only be listed once per batch.`
          );
        }
        productIdsInBatch.add(item.productId);

        // Check if productId exists in the database
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new Error(
            `Batch ${batch.batchNumber}, Item: Product with ID ${item.productId} does not exist.`
          );
        }
      }

      // 3c. initialQuantity: required, positive integer
      if (
        typeof item.initialQuantity !== "number" ||
        !Number.isInteger(item.initialQuantity) ||
        item.initialQuantity <= 0
      ) {
        throw new Error(
          `Batch ${batch.batchNumber}, product ${item.productId}: 'initialQuantity' must be a positive integer.`
        );
      }

      // 3d. costPrice & retailPrice: required, non‐negative numbers
      if (
        typeof item.costPrice !== "number" ||
        isNaN(item.costPrice) ||
        item.costPrice < 0
      ) {
        throw new Error(
          `Batch ${batch.batchNumber}, product ${item.productId}: 'costPrice' must be a non‐negative number.`
        );
      }
      if (
        typeof item.retailPrice !== "number" ||
        isNaN(item.retailPrice) ||
        item.retailPrice < 0
      ) {
        throw new Error(
          `Batch ${batch.batchNumber}, product ${item.productId}: 'retailPrice' must be a non‐negative number.`
        );
      }

      // ─── NEW CHECK: retailPrice must be ≥ costPrice ───────────────────────
      if (item.retailPrice < item.costPrice) {
        throw new Error(
          `Batch ${batch.batchNumber}, product ${item.productId}: 'retailPrice' (${item.retailPrice}) must be greater than or equal to 'costPrice' (${item.costPrice}).`
        );
      }
      // ───────────────────────────────────────────────────────────────────────
    }
  }
}
