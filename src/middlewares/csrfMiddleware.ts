// src/middlewares/csrfMiddleware.ts
import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { PrismaClient } from "@prisma/client";
import { isCSRFTokenValid } from "@services/auth.services/csrf.service";

const prisma = new PrismaClient();

export interface CsrfRequest extends Request {
  sessionId?: number;
}

export const validateCsrfToken = expressAsyncHandler(
  async (req: CsrfRequest, res: Response, next: NextFunction) => {
    // Skip CSRF for safe HTTP methods
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    const clientToken = req.header("X-CSRF-Token");

    if (!clientToken) {
      throw new Error(
        "CSRF token required for this operation: CSRF_TOKEN_MISSING"
      );
    }

    if (!req.sessionId) {
      throw new Error("Valid session required: SESSION_MISSING");
    }

    const isValid = await isCSRFTokenValid(req.sessionId, clientToken);

    if (!isValid) {
      throw new Error("Invalid or expired CSRF token: CSRF_TOKEN_INVALID");
    }

    next();
  }
);
