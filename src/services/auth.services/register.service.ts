import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { isValidEmail } from "@services/auth.services/validator/isEmailValid";

const prisma = new PrismaClient();

interface UserRegistrationData {
  fullname: string;
  email: string;
  password: string;
  roleId: number;
}

export const registerUser = async (userData: UserRegistrationData) => {
  if (
    !userData.fullname ||
    !userData.email ||
    !userData.password ||
    !userData.roleId
  ) {
    throw new Error("All fields are required.");
  }

  // Validate email
  if (!isValidEmail(userData.email)) {
    throw new Error("Invalid email format.");
  }

  // Validate password
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordRegex.test(userData.password)) {
    throw new Error(
      "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a symbol."
    );
  }

  // Check if the role exists
  const role = await prisma.role.findUnique({
    where: { id: userData.roleId },
  });

  if (!role) {
    throw new Error("Invalid role ID.");
  }

  // Check if user with email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email },
  });

  if (existingUser) {
    throw new Error("User with this email already exists.");
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  // Create the user
  const newUser = await prisma.user.create({
    data: {
      fullname: userData.fullname,
      email: userData.email,
      password: hashedPassword,
      roleId: userData.roleId,
      isEmailVerified: false,
    },
    select: {
      id: true,
      fullname: true,
      email: true,
      role: {
        select: {
          name: true,
        },
      },
      created: true,
    },
  });

  return newUser;
};
