import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const CSRF_TOKEN_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours

export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const createOrRefreshCsrfToken = async (
  sessionId: number
): Promise<string> => {
  const newToken = generateCsrfToken();
  const expiresAt = new Date(Date.now() + CSRF_TOKEN_EXPIRY);

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      csrfToken: newToken,
      csrfTokenExpiresAt: expiresAt,
    },
  });

  return newToken;
};

export const isCSRFTokenValid = async (
  sessionId: number,
  clientToken: string
): Promise<boolean> => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      csrfToken: true,
      csrfTokenExpiresAt: true,
    },
  });

  if (!session || !session.csrfToken || !session.csrfTokenExpiresAt) {
    return false;
  }

  const now = new Date();
  const isTokenMatch = session.csrfToken === clientToken;
  const isNotExpired = now < session.csrfTokenExpiresAt;

  return isTokenMatch && isNotExpired;
};
