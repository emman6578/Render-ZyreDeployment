import { PrismaClient } from "@prisma/client";
import { validateForeignKeys } from "./validateForeignKeys";

const prisma = new PrismaClient();

export interface UpdateProductData {
  image?: string;
  genericId?: number;
  brandId?: number;
  categoryIds?: number[];
  companyId?: number;
  averageCostPrice?: number;
  averageRetailPrice?: number;
  lastUpdateReason?: string;
  updatedById: number;
}

// Helper function to check for duplicate products
const checkForDuplicateProduct = async (
  id: number,
  genericId?: number,
  brandId?: number,
  categoryIds?: number[],
  companyId?: number
) => {
  // Only check for duplicates if key identifying fields are being updated
  if (!genericId && !brandId && !categoryIds && !companyId) {
    return; // No key fields being updated, skip duplicate check
  }

  // Get current product data to use as fallback for undefined values
  const currentProduct = await prisma.product.findUnique({
    where: { id },
    select: {
      genericId: true,
      brandId: true,
      categories: { select: { id: true } },
      companyId: true,
    },
  });

  if (!currentProduct) {
    throw new Error("Product not found");
  }

  // Use provided values or fall back to current values
  const finalGenericId = genericId ?? currentProduct.genericId;
  const finalBrandId = brandId ?? currentProduct.brandId;
  const finalCompanyId = companyId ?? currentProduct.companyId;
  const finalCategoryIds =
    categoryIds ?? currentProduct.categories.map((c) => c.id);

  // Check for existing product with the same combination (excluding current product)
  const duplicateProduct = await prisma.product.findFirst({
    where: {
      AND: [
        { id: { not: id } }, // Exclude current product
        { genericId: finalGenericId },
        { brandId: finalBrandId },
        { companyId: finalCompanyId },
        {
          categories: {
            every: {
              id: {
                in: finalCategoryIds,
              },
            },
          },
        },
      ],
    },
    include: {
      generic: { select: { name: true } },
      brand: { select: { name: true } },
      categories: { select: { name: true } },
      company: { select: { name: true } },
    },
  });

  if (duplicateProduct) {
    const categoryNames = duplicateProduct.categories
      .map((c) => c.name)
      .join(", ");
    throw new Error(
      `A product with the same combination already exists: ${duplicateProduct.generic?.name} - ${duplicateProduct.brand?.name} - ${categoryNames} - ${duplicateProduct.company?.name}`
    );
  }
};

export const update_products = async (id: number, data: UpdateProductData) => {
  if (!id || isNaN(id)) {
    throw new Error("Valid product ID is required");
  }

  // Check if product exists
  const existingProduct = await prisma.product.findUnique({
    where: { id },
    include: {
      categories: true,
    },
  });

  if (!existingProduct) {
    throw new Error("Product not found");
  }

  // Validate foreign key references if provided
  await validateForeignKeys(
    data.genericId,
    data.brandId,
    data.categoryIds, // Updated to handle array
    data.companyId
  );

  // Check for duplicate products before updating
  await checkForDuplicateProduct(
    id,
    data.genericId,
    data.brandId,
    data.categoryIds,
    data.companyId
  );

  // Validate price changes
  const updateData: any = {
    updatedById: data.updatedById,
    lastUpdateReason: data.lastUpdateReason || "Product information updated",
  };

  if (data.image !== undefined) updateData.image = data.image;
  if (data.genericId) updateData.genericId = data.genericId;
  if (data.brandId) updateData.brandId = data.brandId;
  if (data.companyId) updateData.companyId = data.companyId;

  // Handle price updates
  let priceChanged = false;
  if (data.averageCostPrice !== undefined) {
    if (data.averageCostPrice < 0)
      throw new Error("Cost price cannot be negative");
    if (data.averageCostPrice !== existingProduct.averageCostPrice.toNumber()) {
      updateData.averageCostPrice = data.averageCostPrice;
      priceChanged = true;
    }
  }

  if (data.averageRetailPrice !== undefined) {
    if (data.averageRetailPrice < 0)
      throw new Error("Retail price cannot be negative");
    if (
      data.averageRetailPrice !== existingProduct.averageRetailPrice.toNumber()
    ) {
      updateData.averageRetailPrice = data.averageRetailPrice;
      priceChanged = true;
    }
  }

  // Validate retail price is not less than cost price
  const finalCostPrice =
    updateData.averageCostPrice || existingProduct.averageCostPrice.toNumber();
  const finalRetailPrice =
    updateData.averageRetailPrice ||
    existingProduct.averageRetailPrice.toNumber();

  if (finalRetailPrice < finalCostPrice) {
    throw new Error("Retail price cannot be less than cost price");
  }

  // Start transaction for product update and category relations
  const updatedProduct = await prisma.$transaction(async (prisma) => {
    // Update product basic info
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Handle category updates if provided
    if (data.categoryIds) {
      // First, disconnect all existing categories
      await prisma.product.update({
        where: { id },
        data: {
          categories: {
            set: [],
          },
        },
      });

      // Then connect the new categories
      await prisma.product.update({
        where: { id },
        data: {
          categories: {
            connect: data.categoryIds.map((id) => ({ id })),
          },
        },
      });
    }

    // Return the updated product with relations
    return await prisma.product.findUnique({
      where: { id },
      include: {
        generic: true,
        brand: true,
        categories: true,
        company: true,
        updatedBy: {
          select: { id: true, fullname: true, email: true },
        },
      },
    });
  });

  // Create price history entry if prices changed
  if (priceChanged) {
    await prisma.productPriceHistory.create({
      data: {
        productId: updatedProduct!.id,
        averageCostPrice: finalCostPrice,
        averageRetailPrice: finalRetailPrice,
        previousCostPrice: existingProduct.averageCostPrice,
        previousRetailPrice: existingProduct.averageRetailPrice,
        createdById: data.updatedById,
        reason: data.lastUpdateReason || "Price update",
      },
    });
  }

  return updatedProduct;
};
