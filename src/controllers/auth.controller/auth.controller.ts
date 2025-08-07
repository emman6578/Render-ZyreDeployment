import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";

//Services Imports
import { registerUser } from "@services/auth.services/register.service";
import { loginUser } from "@services/auth.services/login.service";
import { COOKIE_OPTIONS } from "@utils/Cookie/cookie-options";
import {
  createOrRefreshCsrfToken,
  CSRF_TOKEN_EXPIRY,
} from "@services/auth.services/csrf.service";
import { CsrfRequest } from "@middlewares/csrfMiddleware";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "@middlewares/authMiddleware";

const prisma = new PrismaClient();

export const register = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const user = req.body;
    const createdUser = await registerUser(user);
    if (!createdUser) {
      throw new Error("Error creating user.");
    }
    successHandler(createdUser, res, "POST", "User Created Successfully");
  }
);

export const login = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const authData = await loginUser(email, password);
    const csrfToken = await createOrRefreshCsrfToken(authData.sessionId);

    // Set JWT in HTTP-only cookie
    res.cookie("auth_token", authData.token, COOKIE_OPTIONS);

    res.cookie("csrf_token", csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: CSRF_TOKEN_EXPIRY, // 2 hours
      path: "/",
    });

    await prisma.activityLog.create({
      data: {
        userId: authData.user.id, // who logged in
        model: "Session", // you could also use "User" or "Auth"
        recordId: authData.sessionId, // ties back to your Session row
        action: "LOGIN", // ActionType.LOGIN
        description: `User logged in via ${req.ip}`,
        ipAddress: req.ip, // express-populated IP
        userAgent: req.get("User-Agent") || undefined,
      },
    });

    // Return user data without the token
    successHandler("Welcome to the system!", res, "POST", "Login successful");
  }
);

export const refreshCsrfToken = expressAsyncHandler(
  async (req: CsrfRequest, res: Response) => {
    if (!req.sessionId) {
      throw new Error("Authentication required: SESSION_MISSING");
    }

    const newToken = await createOrRefreshCsrfToken(req.sessionId);

    // Update cookie
    res.cookie("csrf_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: CSRF_TOKEN_EXPIRY,
      path: "/",
    });

    res.json({
      csrfToken: newToken,
    });
  }
);

// Background job to clean up expired CSRF tokens
//TODO: Cron job or scheduled task to run this periodically
export const cleanupExpiredCSRFTokens = async (): Promise<void> => {
  await prisma.session.updateMany({
    where: {
      csrfTokenExpiresAt: {
        lt: new Date(),
      },
    },
    data: {
      csrfToken: null,
      csrfTokenExpiresAt: null,
    },
  });
};

export const logout = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (req.sessionId) {
      await prisma.session.delete({ where: { id: req.sessionId } });
    }
    // Clear the auth cookie
    res.clearCookie("auth_token", {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.clearCookie("csrf_token", {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    successHandler(null, res, "POST", "Logout successful");
  }
);
