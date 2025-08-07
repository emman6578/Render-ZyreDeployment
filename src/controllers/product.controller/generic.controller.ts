import { AuthRequest } from "@middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";

const prisma = new PrismaClient();

// CREATE Generics
export const create = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    let { name, isActive = true } = req.body;
    if (!name) {
      res.status(400);
      throw new Error("Generic name is required");
    }
    name = name.toUpperCase();
    try {
      const generic = await prisma.generic.create({
        data: { name, isActive },
      });
      successHandler(generic, res, "POST", "Created Generics successfully");
    } catch (error: any) {
      if (error.code === "P2002") {
        // Prisma unique constraint failed
        res.status(409);
        throw new Error("Generic name must be unique");
      }
      res.status(500);
      throw new Error(error.message || "Failed to create generic");
    }
  }
);

// READ Generics
export const read = expressAsyncHandler(async (req: Request, res: Response) => {
  const { search, page = "1", limit = "10" } = req.query;

  const pageNumber = parseInt(page as string, 10) || 1;
  const itemsPerPage = parseInt(limit as string, 10) || 1000;
  const skip = (pageNumber - 1) * itemsPerPage;

  const whereClause = {
    isActive: true,
    ...(search
      ? {
          name: {
            contains: search as string,
          },
        }
      : {}),
  };

  // Get total count for pagination
  const totalItems = await prisma.generic.count({ where: whereClause });
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const response = await prisma.generic.findMany({
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
    { generics: response, pagination },
    res,
    "GET",
    `Getting ${search ? "filtered" : "all"} generics values`
  );
});

// READ Single Generics by ID
export const readById = expressAsyncHandler(
  async (req: Request, res: Response) => {
    successHandler(
      "Read Single Generics",
      res,
      "GET",
      "Generics fetched successfully"
    );
  }
);

// UPDATE Generics
export const update = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    let { name, isActive } = req.body;
    if (!id) {
      res.status(400);
      throw new Error("Generic id is required");
    }
    try {
      // Check if generic exists
      const existing = await prisma.generic.findUnique({
        where: { id: Number(id) },
      });
      if (!existing) {
        res.status(404);
        throw new Error("Generic not found");
      }
      // Prepare update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.toUpperCase();
      if (isActive !== undefined) updateData.isActive = isActive;
      if (Object.keys(updateData).length === 0) {
        res.status(400);
        throw new Error("No update fields provided");
      }
      const updated = await prisma.generic.update({
        where: { id: Number(id) },
        data: updateData,
      });
      successHandler(updated, res, "PUT", "Generics updated successfully");
    } catch (error: any) {
      if (error.code === "P2002") {
        // Prisma unique constraint failed
        res.status(409);
        throw new Error("Generic name must be unique");
      }
      res.status(500);
      throw new Error(error.message || "Failed to update generic");
    }
  }
);

// DELETE Generics (Soft delete - set isActive to false)
export const remove = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Generics Deleted Successfully",
      res,
      "DELETE",
      "Generics deactivated successfully"
    );
  }
);

// RESTORE Generics (Reactivate soft-deleted Generics)
export const restore = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Generics Restored Successfully",
      res,
      "PUT",
      "Generics restored successfully"
    );
  }
);
