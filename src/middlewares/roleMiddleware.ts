import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { AuthRequest } from "./authMiddleware";

export const authorizeRoles = (allowedRoles: string[]) =>
  expressAsyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      // Ensure that the user is attached from the auth middleware
      if (!req.user || !req.user.roleName) {
        throw new Error("User role not found or user not authenticated");
      }

      // If user is SUPERADMIN, always allow access
      if (req.user.roleName === "SUPERADMIN") {
        return next();
      }

      // Check if the user's role is included in the allowed roles
      if (!allowedRoles.includes(req.user.roleName)) {
        throw new Error("Access forbidden: Insufficient rights");
      }

      next();
    }
  );
