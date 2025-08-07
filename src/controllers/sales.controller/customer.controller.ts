import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import expressAsyncHandler from "express-async-handler";
import { AuthRequest } from "@middlewares/authMiddleware";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";

const prisma = new PrismaClient();

export const read = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { search, page = "1", limit = "10" } = req.query;

    const pageNumber = parseInt(page as string, 10) || 1;
    const itemsPerPage = parseInt(limit as string, 10) || 1000;
    const skip = (pageNumber - 1) * itemsPerPage;

    const whereClause = search
      ? {
          customerName: {
            contains: search as string,
          },
        }
      : {};

    // Get total count for pagination
    const totalItems = await prisma.customer.count({ where: whereClause });
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    const findCustomer = await prisma.customer.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
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
      { customers: findCustomer, pagination },
      res,
      "GET",
      `Getting ${search ? "filtered" : "all"} customers successfully`
    );
  }
);

export const create = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler("result", res, "POST", "Customer created successfully");
  }
);

// add her on update the isActive to soft delete the customer
export const update = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "Updated Customer",
      res,
      "PUT",
      "Customer updated successfully"
    );
  }
);
