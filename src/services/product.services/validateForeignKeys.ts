import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const validateForeignKeys = async (
  genericId?: number,
  brandId?: number,
  categoryIds?: number[] | number, // Updated to handle both array and single number
  companyId?: number
) => {
  const validationPromises = [];
  const labels: string[] = [];

  if (genericId) {
    validationPromises.push(
      prisma.generic.findUnique({ where: { id: genericId } })
    );
    labels.push("Generic");
  }

  if (brandId) {
    validationPromises.push(
      prisma.brand.findUnique({ where: { id: brandId } })
    );
    labels.push("Brand");
  }

  // Handle both single category ID and array of category IDs
  if (categoryIds) {
    if (Array.isArray(categoryIds)) {
      // Handle array of category IDs
      if (categoryIds.length > 0) {
        validationPromises.push(
          prisma.category.findMany({
            where: {
              id: {
                in: categoryIds,
              },
            },
          })
        );
        labels.push("Categories");
      }
    } else {
      // Handle single category ID (backward compatibility)
      validationPromises.push(
        prisma.category.findUnique({ where: { id: categoryIds } })
      );
      labels.push("Category");
    }
  }

  if (companyId) {
    validationPromises.push(
      prisma.company.findUnique({ where: { id: companyId } })
    );
    labels.push("Company");
  }

  if (validationPromises.length > 0) {
    const results = await Promise.all(validationPromises);

    results.forEach((result, index) => {
      const label = labels[index];

      if (label === "Categories") {
        // Special handling for category array validation
        const categories = result as any[];
        const expectedCategoryIds = Array.isArray(categoryIds)
          ? categoryIds
          : [];

        if (categories.length !== expectedCategoryIds.length) {
          const foundCategoryIds = categories.map((cat) => cat.id);
          const missingCategoryIds = expectedCategoryIds.filter(
            (id) => !foundCategoryIds.includes(id)
          );
          throw new Error(
            `Category(ies) with ID(s) ${missingCategoryIds.join(
              ", "
            )} not found`
          );
        }
      } else {
        // Standard validation for single entities
        if (!result) {
          throw new Error(`${label} not found`);
        }
      }
    });
  }
};
