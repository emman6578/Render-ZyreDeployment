import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient, User } from "@prisma/client";
import expressAsyncHandler from "express-async-handler";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export interface AuthRequest extends Request {
  user?: User & {
    roleName?: string;
    storeNames?: string[];
    positionName?: string;
  };
  prisma?: PrismaClient;
  sessionId?: number;
  userId?: string;
}

export const authenticateToken = expressAsyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Get token from HTTP-only cookie instead of Authorization header
    const token = req.cookies.auth_token;

    if (!token) {
      throw new Error("Authentication failed: No token provided: UNAUTHORIZED");
    }

    // Decode JWT token
    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        sessionId: number;
        userId: string;
        role: string;
      };

      // Verify session exists and is valid
      const session = await prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: {
          user: {
            include: {
              role: true,
              stores: true,
              position: true,
            },
          },
        },
      });

      if (!session || session.expires < new Date()) {
        // Clear the invalid cookie
        res.clearCookie("auth_token", {
          httpOnly: true,
          path: "/",
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        throw new Error("Session expired or invalid: SESSION_EXPIRED");
      }

      // Attach user to request with formatted data
      req.user = session.user;
      req.user.roleName = session.user.role.name;
      req.user.storeNames = session.user.stores.map((store) => store.name);
      req.user.positionName = session.user.position?.name;

      req.sessionId = payload.sessionId; // CSRF middleware needs this
      req.userId = payload.userId; // Useful for other purposes

      next();
    } catch (error) {
      console.error("JWT verification error:", error); // Debug log

      // Clear the invalid cookie
      res.clearCookie("auth_token", {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });

      res.clearCookie("csrf_token", {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });

      throw new Error("Unauthorized: Invalid token: INVALID_TOKEN");
    }
  }
);
