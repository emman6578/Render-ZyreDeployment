// purchase.service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// UPDATE Purchase
export interface PurchaseUpdateData {
  batchNumber?: string;
  supplierId?: number;
  districtId?: number;
  dt?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  status?: "ACTIVE" | "EXPIRED" | "DAMAGED" | "RETURNED";
  receivedBy?: string;
  verifiedBy?: string;
  verificationDate?: string;
  items?: PurchaseItemUpdateData[];
}

export interface PurchaseItemUpdateData {
  id?: number; // If provided, update existing item; if not, create new item
  productId: number;
  initialQuantity: number;
  currentQuantity: number;
  costPrice: number;
  retailPrice: number;
  status?: "ACTIVE" | "EXPIRED" | "DAMAGED" | "RETURNED";
  lastUpdateReason?: string;
  _delete?: boolean; // Flag to mark item for deletion
}

export const updatePurchase = async (
  purchaseId: number,
  updateData: PurchaseUpdateData,
  userId: number,
  ipAddress: string,
  userAgent: string
): Promise<any> => {
  try {
    // 1. Fetch current purchase
    const currentPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: true,
        supplier: true,
        district: true,
      },
    });

    if (!currentPurchase) {
      throw new Error("Purchase not found");
    }

    //CHECK: Prevent deletion if only one item exists
    if (updateData.items && updateData.items.length) {
      const itemsToDelete = updateData.items.filter(
        (item) => item._delete && item.id
      );

      if (itemsToDelete.length > 0) {
        const currentItemCount = currentPurchase.items.length;
        const remainingItemsAfterDeletion =
          currentItemCount - itemsToDelete.length;

        if (remainingItemsAfterDeletion < 1) {
          throw new Error(
            "Cannot delete all items. Purchase must have at least one item."
          );
        }
      }
    }

    // 2. Run all updates in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // --- Prepare and apply purchase-level changes ---
      const purchaseUpdateFields: any = {};
      const purchaseChanges: Record<string, { old: any; new: any }> = {};
      let hadAnyItemChanges = false;

      // batchNumber, supplierId, districtId, dt, invoiceNumber...
      if (
        updateData.batchNumber !== undefined &&
        updateData.batchNumber !== currentPurchase.batchNumber
      ) {
        purchaseUpdateFields.batchNumber = updateData.batchNumber;
        purchaseChanges.batchNumber = {
          old: currentPurchase.batchNumber,
          new: updateData.batchNumber,
        };
      }
      if (
        updateData.supplierId !== undefined &&
        updateData.supplierId !== currentPurchase.supplierId
      ) {
        purchaseUpdateFields.supplier = {
          connect: { id: updateData.supplierId },
        };
        purchaseChanges.supplierId = {
          old: currentPurchase.supplierId,
          new: updateData.supplierId,
        };
      }

      if (
        updateData.districtId !== undefined &&
        updateData.districtId !== currentPurchase.districtId
      ) {
        purchaseUpdateFields.district = {
          connect: { id: updateData.districtId },
        };
        purchaseChanges.districtId = {
          old: currentPurchase.districtId,
          new: updateData.districtId,
        };
      }
      if (updateData.dt !== undefined && updateData.dt !== currentPurchase.dt) {
        purchaseUpdateFields.dt = updateData.dt;
        purchaseChanges.dt = { old: currentPurchase.dt, new: updateData.dt };
      }
      if (
        updateData.invoiceNumber !== undefined &&
        updateData.invoiceNumber !== currentPurchase.invoiceNumber
      ) {
        purchaseUpdateFields.invoiceNumber = updateData.invoiceNumber;
        purchaseChanges.invoiceNumber = {
          old: currentPurchase.invoiceNumber,
          new: updateData.invoiceNumber,
        };
      }

      if (updateData.invoiceDate !== undefined) {
        const newInvoiceDate = new Date(updateData.invoiceDate);
        if (
          newInvoiceDate.getTime() !== currentPurchase.invoiceDate.getTime()
        ) {
          purchaseUpdateFields.invoiceDate = newInvoiceDate;
          purchaseChanges.invoiceDate = {
            old: currentPurchase.invoiceDate,
            new: newInvoiceDate,
          };
        }
      }

      if (updateData.expiryDate !== undefined) {
        const newExpiryDate = new Date(updateData.expiryDate);
        if (newExpiryDate.getTime() !== currentPurchase.expiryDate.getTime()) {
          purchaseUpdateFields.expiryDate = newExpiryDate;
          purchaseChanges.expiryDate = {
            old: currentPurchase.expiryDate,
            new: newExpiryDate,
          };
        }
      }

      if (updateData.manufacturingDate !== undefined) {
        const newManDate = updateData.manufacturingDate
          ? new Date(updateData.manufacturingDate)
          : null;
        const oldManDate = currentPurchase.manufacturingDate;
        if (
          (newManDate?.getTime() || null) !== (oldManDate?.getTime() || null)
        ) {
          purchaseUpdateFields.manufacturingDate = newManDate;
          purchaseChanges.manufacturingDate = {
            old: oldManDate,
            new: newManDate,
          };
        }
      }

      if (
        updateData.status !== undefined &&
        updateData.status !== currentPurchase.status
      ) {
        purchaseUpdateFields.status = updateData.status;
        purchaseChanges.status = {
          old: currentPurchase.status,
          new: updateData.status,
        };
      }

      if (
        updateData.receivedBy !== undefined &&
        updateData.receivedBy !== currentPurchase.receivedBy
      ) {
        purchaseUpdateFields.receivedBy = updateData.receivedBy;
        purchaseChanges.receivedBy = {
          old: currentPurchase.receivedBy,
          new: updateData.receivedBy,
        };
      }

      if (
        updateData.verifiedBy !== undefined &&
        updateData.verifiedBy !== currentPurchase.verifiedBy
      ) {
        purchaseUpdateFields.verifiedBy = updateData.verifiedBy;
        purchaseChanges.verifiedBy = {
          old: currentPurchase.verifiedBy,
          new: updateData.verifiedBy,
        };
      }

      if (updateData.verificationDate !== undefined) {
        const newVerDate = updateData.verificationDate
          ? new Date(updateData.verificationDate)
          : null;
        const oldVerDate = currentPurchase.verificationDate;
        if (
          (newVerDate?.getTime() || null) !== (oldVerDate?.getTime() || null)
        ) {
          purchaseUpdateFields.verificationDate = newVerDate;
          purchaseChanges.verificationDate = {
            old: oldVerDate,
            new: newVerDate,
          };
        }
      }

      let updatedPurchase = currentPurchase;

      const getProductNames = async (productId: number) => {
        const product = await tx.product.findUnique({
          where: { id: productId },
          include: {
            generic: true,
            brand: true,
          },
        });
        return {
          genericName: product?.generic.name || "",
          brandName: product?.brand.name || "",
        };
      };

      // ✅ FIXED: Only create purchase edit log if there are actual purchase-level changes
      if (Object.keys(purchaseUpdateFields).length) {
        purchaseUpdateFields.updatedBy = { connect: { id: userId } };
        updatedPurchase = await tx.purchase.update({
          where: { id: purchaseId },
          data: purchaseUpdateFields,
          include: {
            items: true,
            supplier: true,
            district: true,
          },
        });

        const productsInPurchase = await tx.product.findMany({
          where: {
            id: {
              in: updatedPurchase.items.map((item) => item.productId),
            },
          },
          include: {
            generic: true,
            brand: true,
          },
        });

        const productNames = productsInPurchase
          .map((p) => `${p.generic.name} (${p.brand.name})`)
          .join(", ");

        // ✅ FIXED: Only log purchase edit when purchase fields actually changed
        await tx.purchaseEdit.create({
          data: {
            editType: "PURCHASE",
            referenceNumber: updatedPurchase.referenceNumber,
            purchaseId,
            action: "UPDATE",
            changedFields: purchaseChanges,
            reason: "Purchase record updated",
            editedById: userId,
            batchNumber: updatedPurchase.batchNumber,
          },
        });

        await tx.activityLog.create({
          data: {
            userId,
            model: "Purchase",
            recordId: purchaseId,
            action: "UPDATE",
            description: `Updated purchase batch: ${updatedPurchase.batchNumber}`,
            ipAddress,
            userAgent,
          },
        });
      }

      // --- Handle each item in updateData.items ---
      if (updateData.items && updateData.items.length) {
        const currentItems = currentPurchase.items;
        for (const item of updateData.items) {
          // DELETE
          if (item._delete && item.id) {
            const toDel = currentItems.find((ci) => ci.id === item.id);
            const refNum = currentPurchase.referenceNumber;
            if (toDel) {
              hadAnyItemChanges = true;

              // Before deleting, check for returns
              const hasReturns = await tx.purchaseReturn.count({
                where: { originalPurchaseItemId: item.id },
              });

              if (hasReturns > 0) {
                throw new Error(
                  "This item already has return record cannot be deleted"
                );
              }

              await tx.purchaseItems.delete({ where: { id: item.id } });

              await tx.productTransaction.create({
                data: {
                  productId: toDel.productId,
                  transactionType: "PURCHASE_EDIT",
                  quantityOut: toDel.currentQuantity,
                  costPrice: toDel.costPrice,
                  retailPrice: toDel.retailPrice,
                  userId: userId,
                  sourceModel: "PurchaseItems",
                  sourceId: toDel.id,
                  description: `Item removed from purchase batch ${updatedPurchase.batchNumber}`,
                  referenceNumber: refNum,
                },
              });

              const { genericName, brandName } = await getProductNames(
                toDel.productId
              );
              await tx.purchaseEdit.create({
                data: {
                  editType: "PURCHASE_ITEM",
                  referenceNumber: updatedPurchase.referenceNumber,
                  purchaseItemId: item.id,
                  action: "DELETE",
                  changedFields: { deleted: { old: false, new: true } },
                  reason: `Purchase item deleted`,
                  editedById: userId,
                  batchNumber: updatedPurchase.batchNumber,
                  genericName,
                  brandName,
                },
              });

              await tx.activityLog.create({
                data: {
                  userId,
                  model: "PurchaseItems",
                  recordId: item.id,
                  action: "DELETE",
                  description: `Deleted purchase item for product ID: ${toDel.productId}`,
                  ipAddress,
                  userAgent,
                },
              });
            }
            continue;
          }

          // UPDATE EXISTING
          if (item.id) {
            const curr = currentItems.find((ci) => ci.id === item.id);
            if (!curr) {
              console.log(`Item with ID ${item.id} not found in current items`);
              continue;
            }

            const fields: any = {};
            const changes: Record<string, any> = {};
            if (item.productId !== curr.productId) {
              fields.product = { connect: { id: item.productId } }; // ✅ Use relation syntax
              changes.productId = { old: curr.productId, new: item.productId };
            }
            if (item.initialQuantity !== curr.initialQuantity) {
              fields.initialQuantity = item.initialQuantity;
              changes.initialQuantity = {
                old: curr.initialQuantity,
                new: item.initialQuantity,
              };
            }
            if (item.currentQuantity !== curr.currentQuantity) {
              fields.currentQuantity = item.currentQuantity;
              changes.currentQuantity = {
                old: curr.currentQuantity,
                new: item.currentQuantity,
              };
            }
            const currCost = parseFloat(curr.costPrice.toString());
            if (item.costPrice !== currCost) {
              fields.costPrice = item.costPrice;
              changes.costPrice = { old: currCost, new: item.costPrice };
            }
            const currRetail = parseFloat(curr.retailPrice.toString());
            if (item.retailPrice !== currRetail) {
              fields.retailPrice = item.retailPrice;
              changes.retailPrice = { old: currRetail, new: item.retailPrice };
            }
            if (item.status && item.status !== curr.status) {
              fields.status = item.status;
              changes.status = { old: curr.status, new: item.status };
            }
            if (item.lastUpdateReason) {
              fields.lastUpdateReason = item.lastUpdateReason;
              changes.lastUpdateReason = {
                old: curr.lastUpdateReason,
                new: item.lastUpdateReason,
              };
            }

            // ✅ FIXED: Only create item edit log if there are actual item changes
            if (Object.keys(fields).length) {
              hadAnyItemChanges = true;
              fields.updatedBy = { connect: { id: userId } };
              await tx.purchaseItems.update({
                where: { id: item.id },
                data: fields,
              });

              // ✅ FIXED: Only log item edit when item fields actually changed
              const { genericName, brandName } = await getProductNames(
                item.productId
              );

              await tx.purchaseEdit.create({
                data: {
                  editType: "PURCHASE_ITEM",
                  referenceNumber: updatedPurchase.referenceNumber,
                  purchaseItemId: item.id,
                  action: "UPDATE",
                  changedFields: changes,
                  reason: item.lastUpdateReason || "Purchase item updated",
                  editedById: userId,
                  batchNumber: updatedPurchase.batchNumber,
                  genericName,
                  brandName,
                },
              });

              await tx.activityLog.create({
                data: {
                  userId,
                  model: "PurchaseItems",
                  recordId: item.id,
                  action: "UPDATE",
                  description: `Updated purchase item for product ID: ${item.productId}`,
                  ipAddress,
                  userAgent,
                },
              });
            }
            continue;
          }

          // CREATE NEW
          hadAnyItemChanges = true;
          const newItem = await tx.purchaseItems.create({
            data: {
              batchId: purchaseId,
              productId: item.productId,
              initialQuantity: item.initialQuantity,
              currentQuantity: item.currentQuantity,
              costPrice: item.costPrice,
              retailPrice: item.retailPrice,
              status: item.status ?? "ACTIVE",
              lastUpdateReason: item.lastUpdateReason,
              createdById: userId,
              updatedById: userId,
            },
            include: {
              batch: {
                select: { referenceNumber: true },
              },
            },
          });

          // ✅ FIXED: This is correct - log new item creation
          const { genericName, brandName } = await getProductNames(
            item.productId
          );

          await tx.purchaseEdit.create({
            data: {
              editType: "PURCHASE_ITEM",
              referenceNumber: updatedPurchase.referenceNumber,
              purchaseItemId: newItem.id,
              action: "INSERT",
              changedFields: {
                created: { old: null, new: true },
                productId: { old: null, new: item.productId },
                initialQuantity: { old: null, new: item.initialQuantity },
                currentQuantity: { old: null, new: item.currentQuantity },
                costPrice: { old: null, new: item.costPrice },
                retailPrice: { old: null, new: item.retailPrice },
              },
              reason: item.lastUpdateReason || "New purchase item added",
              editedById: userId,
              batchNumber: updatedPurchase.batchNumber,
              genericName,
              brandName,
            },
          });

          await tx.productTransaction.create({
            data: {
              productId: newItem.productId,
              transactionType: "PURCHASE_RECEIVED",
              quantityIn: item.currentQuantity,
              costPrice: item.costPrice,
              retailPrice: item.retailPrice,
              userId: userId,
              sourceModel: "PurchaseItems",
              sourceId: newItem.id,
              description: `This Product was added from purchase batch ${updatedPurchase.batchNumber}`,
              referenceNumber: newItem.batch.referenceNumber,
            },
          });

          await tx.activityLog.create({
            data: {
              userId,
              model: "PurchaseItems",
              recordId: newItem.id,
              action: "CREATE",
              description: `Created new purchase item for product ID: ${item.productId}`,
              ipAddress,
              userAgent,
            },
          });
        }
      }

      const hadAnyPurchaseChange = Object.keys(purchaseChanges).length > 0;
      const hadAnyChanges = hadAnyPurchaseChange || hadAnyItemChanges;

      if (hadAnyChanges) {
        // Check if inventory batch exists before attempting to delete
        const existingInventoryBatch = await tx.inventoryBatch.findUnique({
          where: {
            supplierId_batchNumber: {
              supplierId: currentPurchase.supplierId,
              batchNumber: currentPurchase.batchNumber,
            },
          },
        });

        // Only delete if the inventory batch exists
        if (existingInventoryBatch) {
          await tx.inventoryBatch.delete({
            where: {
              supplierId_batchNumber: {
                supplierId: currentPurchase.supplierId,
                batchNumber: currentPurchase.batchNumber,
              },
            },
          });
        }
      }

      // 5. Return the fully-loaded, updated purchase
      return await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  generic: true,
                  brand: true,
                  company: true,
                },
              },
            },
          },
          supplier: true,
          district: true,
          createdBy: { select: { id: true, fullname: true, email: true } },
          updatedBy: { select: { id: true, fullname: true, email: true } },
        },
      });
    });

    return updated;
  } catch (err) {
    // Re-throw, so controller's error‐handler can pick it up
    if (err instanceof Error) throw new Error(err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
};
