import { AuthRequest } from "@middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";

//Services Imports
const prisma = new PrismaClient();

export const users = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    const allUsers = await prisma.user.findMany({
      include: {
        role: { select: { name: true } },
        stores: { select: { id: true, name: true } }, // Include both id and name
        position: { select: { id: true, name: true } }, // Include both id and name
      },
    });

    // Format users according to requirements with proper ID structure
    const formattedUsers = allUsers.map((user) => ({
      id: user.id,
      name: user.fullname,
      role: user.role.name.toLowerCase(),
      store: user.stores.map((store) => ({
        id: store.id,
        name: store.name.toLowerCase(),
      })),
      position: user.position
        ? {
            id: user.position.id,
            name: user.position.name.toLowerCase().replace(/_/g, "-"),
          }
        : null,
    }));

    successHandler(
      formattedUsers,
      res,
      "GET",
      "Successfully fetched all the users"
    );
  }
);

export const getCurrentUser = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new Error("User not authenticated");
    }

    // Format user according to requirements
    const formattedUser = {
      id: req.user.id,
      name: req.user.fullname,
      role: req.user.roleName?.toLowerCase(),
      store: req.user.storeNames?.map((name) => name),
      position: req.user.positionName
        ? req.user.positionName.toLowerCase().replace(/_/g, "-")
        : null,
    };

    res.json(formattedUser);
  }
);

export const updateUser = expressAsyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { storeIds, positionId } = req.body; // storeIds: number[], positionId?: number

  // Convert userId to number since it's an integer in the schema
  const userIdInt = parseInt(userId);

  const updatedUser = await prisma.user.update({
    where: { id: userIdInt },
    data: {
      stores: { set: storeIds.map((id: number) => ({ id })) },
      positionId: positionId || null, // Direct assignment since it's a foreign key
    },
    include: {
      stores: { select: { id: true, name: true } },
      position: { select: { id: true, name: true } },
      role: { select: { name: true } },
    },
  });

  // Format user according to requirements with proper ID structure
  const formattedUser = {
    id: updatedUser.id,
    name: updatedUser.fullname,
    role: updatedUser.role.name.toLowerCase(),
    store: updatedUser.stores.map((store) => ({
      id: store.id,
      name: store.name.toLowerCase(),
    })),
    position: updatedUser.position
      ? {
          id: updatedUser.position.id,
          name: updatedUser.position.name.toLowerCase().replace(/_/g, "-"),
        }
      : null,
  };

  successHandler(
    formattedUser,
    res,
    "PUT",
    "User stores and position updated successfully"
  );
});
