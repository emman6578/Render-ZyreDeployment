import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export const checkAndUpdateExpiredBatches = async () => {
  const currentDate = new Date();

  try {
    // Find all active batches that have expired
    const expiredBatches = await prisma.inventoryBatch.findMany({
      where: {
        status: "ACTIVE",
        expiryDate: {
          lt: currentDate, // Less than current date = expired
        },
      },
      include: {
        items: {
          where: {
            status: "ACTIVE", // Only get active items
          },
        },
      },
    });

    if (expiredBatches.length > 0) {
      // Update expired batches
      await prisma.inventoryBatch.updateMany({
        where: {
          status: "ACTIVE",
          expiryDate: {
            lt: currentDate,
          },
        },
        data: {
          status: "EXPIRED",
          updatedAt: currentDate,
        },
      });

      // Update all inventory items in expired batches
      for (const batch of expiredBatches) {
        if (batch.items.length > 0) {
          await prisma.inventoryItem.updateMany({
            where: {
              batchId: batch.id,
              status: "ACTIVE",
            },
            data: {
              status: "EXPIRED",
              updatedAt: currentDate,
              lastUpdateReason:
                "Automatically expired due to batch expiry date",
            },
          });

          // Optional: Create inventory movements for each expired item
          for (const item of batch.items) {
            await prisma.inventoryMovement.create({
              data: {
                inventoryItemId: item.id,
                movementType: "EXPIRED",
                quantity: -item.currentQuantity, // Negative to indicate removal from active stock
                reason: `Batch expired on ${
                  batch.expiryDate.toISOString().split("T")[0]
                }`,
                previousQuantity: item.currentQuantity,
                newQuantity: 0, // Set to 0 as it's no longer usable
                createdById: 1, // System user ID - you might want to make this configurable
                referenceId: `EXPIRED_${batch.referenceNumber}`,
              },
            });
          }
        }
      }

      console.log(
        `Updated ${expiredBatches.length} expired batches and their items`
      );
    }
  } catch (error) {
    console.error("Error updating expired batches:", error);
    // Don't throw error to prevent breaking the main function
  }
};
