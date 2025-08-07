import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const delete_products = async (
  id: number,
  reason: string,
  userId: number
) => {
  if (!id || isNaN(id)) {
    throw new Error("Valid product ID is required");
  }

  const existingProduct = await prisma.product.findUnique({
    where: { id },
    include: {
      inventoryItems: {
        where: { currentQuantity: { gt: 0 } },
      },
    },
  });

  if (!existingProduct) {
    throw new Error("Product not found");
  }

  if (!existingProduct.isActive) {
    throw new Error("Product is already deactivated");
  }

  // Check if product has active inventory
  if (existingProduct.inventoryItems.length > 0) {
    throw new Error(
      "Cannot deactivate product with active inventory. Please clear inventory first."
    );
  }

  const deletedProduct = await prisma.product.update({
    where: { id },
    data: {
      isActive: false,
      updatedById: userId,
      lastUpdateReason: reason || "Product deactivated",
    },
    include: {
      generic: true,
      brand: true,
      categories: { select: { name: true } },
      company: true,
    },
  });

  return deletedProduct;
};
