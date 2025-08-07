import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import expressAsyncHandler from "express-async-handler";
import { AuthRequest } from "@middlewares/authMiddleware";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";

const prisma = new PrismaClient();

export const create = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler("result", res, "POST", "Collections created successfully");
  }
);

export const read = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    successHandler(
      "responseData",
      res,
      "GET",
      "Collectionss fetched successfully"
    );
  }
);

// export const update = expressAsyncHandler(
//   async (req: AuthRequest, res: Response) => {
//     successHandler("Updated Collectionss", res, "PUT", "Collectionss updated successfully");
//   }
// );

// // DELETE Collectionss (Soft delete - set isActive to false)
// export const remove = expressAsyncHandler(
//   async (req: AuthRequest, res: Response) => {
//     successHandler(
//       "Collectionss Deleted Successfully",
//       res,
//       "DELETE",
//       "Collectionss deactivated successfully"
//     );
//   }
// );

// // RESTORE Collectionss (Reactivate soft-deleted Collectionss)
// export const restore = expressAsyncHandler(
//   async (req: AuthRequest, res: Response) => {
//     successHandler(
//       "Collectionss Restored Successfully",
//       res,
//       "PUT",
//       "Collectionss restored successfully"
//     );
//   }
// );
