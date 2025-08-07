import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { isValidEmail } from "@services/auth.services/validator/isEmailValid";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_EXPIRATION_DAYS = 14; // 2 weeks

export const loginUser = async (email: string, password: string) => {
  // Validate email input
  if (!email) {
    throw new Error("Empty email field");
  }

  if (!isValidEmail(email)) {
    throw new Error("Invalid email format.");
  }

  // Find the user by email
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: true,
      stores: true,
      position: true,
    },
  });

  if (!user) {
    throw new Error("Please register first.");
  }

  // Validate the password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid credentials: Wrong Password");
  }

  // Record lastLogin attempt
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
      isEmailVerified: true, // Auto verify email on successful login
    },
  });

  // Generate session token expiration
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + SESSION_EXPIRATION_DAYS);

  // Create session record
  const session = await prisma.session.create({
    data: {
      token: crypto.randomUUID(),
      expires: expirationDate,
      userId: user.id,
      userAgent: "API Login", // This should come from request headers in a real app
      ipAddress: "0.0.0.0", // This should come from request in a real app
    },
  });

  // Create JWT token with session ID that will be stored in HTTP-only cookie
  const jwtToken = jwt.sign(
    {
      sessionId: session.id,
      userId: user.id,
      role: user.role.name,
    },
    JWT_SECRET!,
    { expiresIn: `${SESSION_EXPIRATION_DAYS}d` }
  );

  // Format user data according to requirements
  const formattedUser = {
    id: user.id,
    name: user.fullname,
    role: user.role.name.toLowerCase(),
    store: user.stores.map((store) => store.name.toUpperCase()),
    position: user.position
      ? user.position.name.toLowerCase().replace("_", "-")
      : null,
  };

  return {
    token: jwtToken,
    user: formattedUser,
    expires: expirationDate,
    sessionId: session.id,
  };
};
