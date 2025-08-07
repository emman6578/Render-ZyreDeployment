import { PrismaClient } from "@prisma/client";
import {
  CreatePurchaseBatchesRequest,
  CreatedPurchaseBatch,
} from "../../types/purchase.types";
import { validateCreatePurchaseBatch } from "@utils/Validators/validateCreatePurchaseBatch";
import { generateRefNumber } from "@utils/reference number/generateRefNumber";

const prisma = new PrismaClient();

export const purchase_create = async (
  data: CreatePurchaseBatchesRequest,
  userId: number
): Promise<CreatedPurchaseBatch[]> => {
  try {
    // ─── RUNTIME VALIDATION CHECK ──────────────────────────────────────────
    // If anything is invalid, validateCreatePurchaseBatchesInput will throw.
    // Pass the prisma instance here
    await validateCreatePurchaseBatch(data, prisma); // Make sure to await

    const batchKeys = new Set();
    for (const batch of data.batches) {
      const key = `${batch.supplierId}-${batch.batchNumber}`;
      if (batchKeys.has(key)) {
        throw new Error(
          `Duplicate batch found in request: Supplier ${batch.supplierId}, Batch ${batch.batchNumber}`
        );
      }
      batchKeys.add(key);
    }

    // ─── EXISTING UNIQUE‐BATCH CHECK ────────────────────────────────────────
    for (const batch of data.batches) {
      const exists = await prisma.purchase.findFirst({
        where: {
          supplierId: batch.supplierId,
          batchNumber: batch.batchNumber,
        },
      });

      if (exists) {
        throw new Error(
          `Batch with number ${batch.batchNumber} already exists for supplier ${batch.supplierId}.`
        );
      }
    }

    // ─── MAIN TRANSACTIONAL LOGIC ──────────────────────────────────────────
    const createdBatches = await prisma.$transaction(async (tx) => {
      const results: CreatedPurchaseBatch[] = [];

      for (const batchData of data.batches) {
        const referenceNumber = await generateRefNumber(prisma, 6, "PUR");
        // 1) Create Purchase
        const batch = await tx.purchase.create({
          data: {
            referenceNumber: referenceNumber,
            batchNumber: batchData.batchNumber,
            supplierId: batchData.supplierId,
            districtId: batchData.districtId,
            dt: batchData.dt,
            invoiceNumber: batchData.invoiceNumber,
            invoiceDate: new Date(batchData.invoiceDate),
            expiryDate: new Date(batchData.expiryDate),
            manufacturingDate: batchData.manufacturingDate
              ? new Date(batchData.manufacturingDate)
              : undefined,
            receivedBy: batchData.receivedBy,
            verifiedBy: batchData.verifiedBy,
            verificationDate: batchData.verificationDate
              ? new Date(batchData.verificationDate)
              : undefined,
            createdById: userId,
            status: "ACTIVE",
          },
          include: {
            supplier: {
              select: { id: true, name: true },
            },
            district: {
              select: { id: true, name: true },
            },
          },
        });

        // 2) Create Purchase Items for each item
        const items = await Promise.all(
          batchData.items.map(async (itemData) => {
            const item = await tx.purchaseItems.create({
              data: {
                batchId: batch.id,
                productId: itemData.productId,
                initialQuantity: itemData.initialQuantity,
                currentQuantity: itemData.initialQuantity,
                costPrice: itemData.costPrice,
                retailPrice: itemData.retailPrice,
                createdById: userId,
                status: "ACTIVE",
              },
              include: {
                product: {
                  include: {
                    generic: { select: { name: true } },
                    brand: { select: { name: true } },
                    company: { select: { name: true } },
                  },
                },
              },
            });

            // Create purchase edit log for new purchase item
            await tx.purchaseEdit.create({
              data: {
                editType: "PURCHASE",
                referenceNumber: referenceNumber,
                purchaseItemId: item.id,
                action: "INSERT",
                changedFields: {
                  genericName: { old: "none", new: item.product.generic.name },
                  brandName: { old: "none", new: item.product.brand.name },
                  initialQuantity: {
                    old: "none",
                    new: itemData.initialQuantity,
                  },
                  currentQuantity: {
                    old: "none",
                    new: itemData.initialQuantity,
                  },
                  costPrice: { old: "none", new: itemData.costPrice },
                  retailPrice: { old: "none", new: itemData.retailPrice },
                },
                reason: "New purchase item created",
                editedById: userId,
                batchNumber: batch.batchNumber,
                genericName: item.product.generic.name,
                brandName: item.product.brand.name,
              },
            });

            return {
              id: item.id,
              productId: item.productId,
              initialQuantity: item.initialQuantity,
              currentQuantity: item.currentQuantity,
              costPrice: parseFloat(item.costPrice.toString()),
              retailPrice: parseFloat(item.retailPrice.toString()),
              status: item.status,
              product: {
                id: item.product.id,
                generic: { name: item.product.generic.name },
                brand: { name: item.product.brand.name },
                company: { name: item.product.company.name },
              },
            };
          })
        );

        // 3) Compute totals
        const totalCostValue = items.reduce(
          (sum, i) => sum + i.costPrice * i.initialQuantity,
          0
        );
        const totalRetailValue = items.reduce(
          (sum, i) => sum + i.retailPrice * i.initialQuantity,
          0
        );

        results.push({
          id: batch.id,
          batchNumber: batch.batchNumber,
          invoiceDate: batch.invoiceDate,
          expiryDate: batch.expiryDate,
          manufacturingDate: batch.manufacturingDate ?? undefined,
          status: batch.status,
          supplier: batch.supplier,
          district: batch.district,
          items,
          itemsCount: items.length,
          totalCostValue: Math.round(totalCostValue * 100) / 100,
          totalRetailValue: Math.round(totalRetailValue * 100) / 100,
        });
      }

      return results;
    });

    return createdBatches;
  } catch (error: any) {
    throw new Error(error);
  } finally {
    // It's generally better to manage prisma connection at a higher level
    // or use a single instance throughout the application,
    // but if you must disconnect here, ensure it's always called.
    await prisma.$disconnect();
  }
};
