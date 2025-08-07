import { AuthRequest } from "@middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";

const prisma = new PrismaClient();

// CREATE Company
export const create = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler("Create Company", res, "POST", "Created Company");
  }
);

// READ Company
export const read = expressAsyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const whereClause = search
    ? {
        name: {
          contains: search as string,
        },
      }
    : {};

  const response = await prisma.company.findMany({
    where: whereClause,
    orderBy: {
      name: "asc",
    },
  });

  successHandler(
    response,
    res,
    "GET",
    `Getting ${search ? "filtered" : "all"} Company values`
  );
});

// READ Single Company by ID
export const readById = expressAsyncHandler(
  async (req: Request, res: Response) => {
    successHandler(
      "Read Single Company",
      res,
      "GET",
      "Company fetched successfully"
    );
  }
);

// UPDATE Company
export const update = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Updated Company",
      res,
      "PUT",
      "Company updated successfully"
    );
  }
);

// DELETE Company (Soft delete - set isActive to false)
export const remove = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Company Deleted Successfully",
      res,
      "DELETE",
      "Company deactivated successfully"
    );
  }
);

// RESTORE Company (Reactivate soft-deleted Company)
export const restore = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Company Restored Successfully",
      res,
      "PUT",
      "Company restored successfully"
    );
  }
);
