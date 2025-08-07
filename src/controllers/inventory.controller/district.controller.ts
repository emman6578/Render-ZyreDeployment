import { AuthRequest } from "@middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";

const prisma = new PrismaClient();

// CREATE Districts
export const create = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    let { name, code, isActive = true } = req.body;
    if (!name) {
      res.status(400);
      throw new Error("District name is required");
    }
    name = name.toUpperCase();
    if (code) code = code.toUpperCase();
    try {
      const district = await prisma.district.create({
        data: { name, code, isActive },
      });
      successHandler(district, res, "POST", "Created District successfully");
    } catch (error: any) {
      if (error.code === "P2002") {
        res.status(409);
        throw new Error("District name or code must be unique");
      }
      res.status(500);
      throw new Error(error.message || "Failed to create district");
    }
  }
);

// READ Districts
export const read = expressAsyncHandler(async (req: Request, res: Response) => {
  const { search, page = 1, limit = 100 } = req.query;

  const pageNumber = parseInt(page as string, 10) || 1;
  const itemsPerPage = parseInt(limit as string, 10) || 1000;
  const skip = (pageNumber - 1) * itemsPerPage;

  const whereClause: any = {
    isActive: true,
  };

  if (search) {
    whereClause.name = {
      contains: search as string,
    };
  }

  const [totalItems, districts] = await Promise.all([
    prisma.district.count({ where: whereClause }),
    prisma.district.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      skip,
      take: itemsPerPage,
    }),
  ]);

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const pagination = {
    currentPage: pageNumber,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage: pageNumber < totalPages,
    hasPreviousPage: pageNumber > 1,
  };

  successHandler(
    { districts, pagination },
    res,
    "GET",
    `Getting ${search ? "filtered" : "all"} Districts values`
  );
});

// READ Single Districts by ID
export const readById = expressAsyncHandler(
  async (req: Request, res: Response) => {
    successHandler(
      "Read Single Districts",
      res,
      "GET",
      "Districts fetched successfully"
    );
  }
);

// UPDATE Districts
export const update = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    let { name, code, isActive } = req.body;
    if (!id) {
      res.status(400);
      throw new Error("District id is required");
    }
    try {
      const existing = await prisma.district.findUnique({
        where: { id: Number(id) },
      });
      if (!existing) {
        res.status(404);
        throw new Error("District not found");
      }
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.toUpperCase();
      if (code !== undefined) updateData.code = code.toUpperCase();
      if (isActive !== undefined) updateData.isActive = isActive;
      if (Object.keys(updateData).length === 0) {
        res.status(400);
        throw new Error("No update fields provided");
      }
      const updated = await prisma.district.update({
        where: { id: Number(id) },
        data: updateData,
      });
      successHandler(updated, res, "PUT", "District updated successfully");
    } catch (error: any) {
      if (error.code === "P2002") {
        res.status(409);
        throw new Error("District name or code must be unique");
      }
      res.status(500);
      throw new Error(error.message || "Failed to update district");
    }
  }
);

// DELETE Districts (Soft delete - set isActive to false)
export const remove = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Districts Deleted Successfully",
      res,
      "DELETE",
      "Districts deactivated successfully"
    );
  }
);

// RESTORE Districts (Reactivate soft-deleted Districts)
export const restore = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Districts Restored Successfully",
      res,
      "PUT",
      "Districts restored successfully"
    );
  }
);
