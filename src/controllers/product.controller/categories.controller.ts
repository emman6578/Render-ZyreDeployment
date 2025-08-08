import { AuthRequest } from "@middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";

const prisma = new PrismaClient();

// CREATE Category
export const create = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    let { name, isActive = true } = req.body;
    if (!name) {
      res.status(400);
      throw new Error("Category name is required");
    }
    name = name.toUpperCase();
    try {
      const category = await prisma.category.create({
        data: { name, isActive },
      });
      successHandler(category, res, "POST", "Created Category successfully");
    } catch (error: any) {
      if (error.code === "P2002") {
        // Prisma unique constraint failed
        res.status(409);
        throw new Error("Category name must be unique");
      }
      res.status(500);
      throw new Error(error.message || "Failed to create category");
    }
  }
);

// READ Category
export const read = expressAsyncHandler(async (req: Request, res: Response) => {
  const { search, page = "1", limit = "10" } = req.query;

  const currentPage = parseInt(page as string, 10) || 1;
  const itemsPerPage = parseInt(limit as string, 10) || 1000;
  const skip = (currentPage - 1) * itemsPerPage;

  const whereClause = {
    isActive: true,
  };

  // Step 1: Fetch all categories with basic filters (excluding search)
  const allCategories = await prisma.category.findMany({
    where: whereClause,
    orderBy: {
      name: "asc",
    },
  });

  // Step 2: Apply search filter (post-query filtering like product service)
  let searched = allCategories;
  if (search) {
    const s = search.toString().toLowerCase();
    searched = allCategories.filter((category) => {
      return (
        category.id.toString().includes(s) ||
        category.name?.toLowerCase().includes(s)
      );
    });
  }

  // Step 3: Paginate
  const totalItems = searched.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginated = searched.slice(skip, skip + itemsPerPage);

  const pagination = {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };

  successHandler(
    { items: paginated, pagination },
    res,
    "GET",
    `Getting ${search ? "filtered" : "all"} Category values`
  );
});

// READ Single Category by ID
export const readById = expressAsyncHandler(
  async (req: Request, res: Response) => {
    successHandler(
      "Read Single Category",
      res,
      "GET",
      "Category fetched successfully"
    );
  }
);

// UPDATE Category
export const update = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    let { name, isActive } = req.body;
    if (!id) {
      res.status(400);
      throw new Error("Category id is required");
    }
    try {
      // Check if category exists
      const existing = await prisma.category.findUnique({
        where: { id: Number(id) },
      });
      if (!existing) {
        res.status(404);
        throw new Error("Category not found");
      }
      // Prepare update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.toUpperCase();
      if (isActive !== undefined) updateData.isActive = isActive;
      if (Object.keys(updateData).length === 0) {
        res.status(400);
        throw new Error("No update fields provided");
      }
      const updated = await prisma.category.update({
        where: { id: Number(id) },
        data: updateData,
      });
      successHandler(updated, res, "PUT", "Category updated successfully");
    } catch (error: any) {
      if (error.code === "P2002") {
        // Prisma unique constraint failed
        res.status(409);
        throw new Error("Category name must be unique");
      }
      res.status(500);
      throw new Error(error.message || "Failed to update category");
    }
  }
);

// DELETE Category (Soft delete - set isActive to false)
export const remove = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Category Deleted Successfully",
      res,
      "DELETE",
      "Category deactivated successfully"
    );
  }
);

// RESTORE Category (Reactivate soft-deleted Category)
export const restore = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Category Restored Successfully",
      res,
      "PUT",
      "Category restored successfully"
    );
  }
);
