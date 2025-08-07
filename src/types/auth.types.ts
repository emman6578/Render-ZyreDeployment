import { Role } from "@prisma/client";

export interface UserInterface {
  email: string;
  password: string;
  fullname: string;
  role?: Role;
}
