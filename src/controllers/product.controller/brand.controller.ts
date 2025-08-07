import { AuthRequest } from "@middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";

const prisma = new PrismaClient();

// CREATE Brands
export const create = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    let { name } = req.body;
    if (!name) {
      res.status(400);
      throw new Error("Brand name is required");
    }
    name = name.toUpperCase();
    // Check if brand already exists
    const existingBrand = await prisma.brand.findUnique({ where: { name } });
    if (existingBrand) {
      res.status(409);
      throw new Error("Brand with this name already exists");
    }
    // Create the brand
    const brand = await prisma.brand.create({
      data: { name },
    });
    successHandler(brand, res, "POST", "Brand created successfully");
  }
);

// READ Brands
export const read = expressAsyncHandler(async (req: Request, res: Response) => {
  const { search, page = "1", limit = "10" } = req.query;

  const pageNumber = parseInt(page as string, 10) || 1;
  const itemsPerPage = parseInt(limit as string, 10) || 1000;
  const skip = (pageNumber - 1) * itemsPerPage;

  const whereClause: any = { isActive: true };
  if (search) {
    whereClause.name = { contains: search as string };
  }

  // Get total count for pagination
  const totalItems = await prisma.brand.count({ where: whereClause });
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const response = await prisma.brand.findMany({
    where: whereClause,
    orderBy: {
      name: "asc",
    },
    skip,
    take: itemsPerPage,
  });

  const pagination = {
    currentPage: pageNumber,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage: pageNumber < totalPages,
    hasPreviousPage: pageNumber > 1,
  };

  successHandler(
    { brands: response, pagination },
    res,
    "GET",
    `Getting ${search ? "filtered" : "all"} Brands values`
  );
});

// READ Single Brands by ID
export const readById = expressAsyncHandler(
  async (req: Request, res: Response) => {
    successHandler(
      "Read Single Brands",
      res,
      "GET",
      "Brands fetched successfully"
    );
  }
);

// UPDATE Brands
export const update = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    let { name, isActive } = req.body;
    if (!id) {
      res.status(400);
      throw new Error("Brand id is required");
    }
    if (!name) {
      res.status(400);
      throw new Error("Brand name is required");
    }
    name = name.toUpperCase();
    // Check if brand exists
    const brand = await prisma.brand.findUnique({ where: { id: Number(id) } });
    if (!brand) {
      res.status(404);
      throw new Error("Brand not found");
    }
    // Check for duplicate name (excluding current brand)
    const existingBrand = await prisma.brand.findFirst({
      where: { name, id: { not: Number(id) } },
    });
    if (existingBrand) {
      res.status(409);
      throw new Error("Another brand with this name already exists");
    }
    // Prepare update data
    const updateData: any = { name };
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }
    // Update the brand
    const updatedBrand = await prisma.brand.update({
      where: { id: Number(id) },
      data: updateData,
    });
    successHandler(updatedBrand, res, "PUT", "Brand updated successfully");
  }
);

// DELETE Brands (Soft delete - set isActive to false)
export const remove = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Brands Deleted Successfully",
      res,
      "DELETE",
      "Brands deactivated successfully"
    );
  }
);

// RESTORE Brands (Reactivate soft-deleted Brands)
export const restore = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Brands Restored Successfully",
      res,
      "PUT",
      "Brands restored successfully"
    );
  }
);
