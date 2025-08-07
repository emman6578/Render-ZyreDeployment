import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const restore_products = async (
  id: number,
  reason: string,
  userId: number
) => {
  if (!id || isNaN(id)) {
    throw new Error("Valid product ID is required");
  }

  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!existingProduct) {
    throw new Error("Product not found");
  }

  if (existingProduct.isActive) {
    throw new Error("Product is already active");
  }

  const restoredProduct = await prisma.product.update({
    where: { id },
    data: {
      isActive: true,
      updatedById: userId,
      lastUpdateReason: reason || "Product reactivated",
    },
    include: {
      generic: true,
      brand: true,
      categories: { select: { name: true } },
      company: true,
      updatedBy: {
        select: { id: true, fullname: true, email: true },
      },
    },
  });

  return restoredProduct;
};
