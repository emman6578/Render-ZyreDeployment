import {
  updateUser,
  users,
  getCurrentUser,
} from "@controllers/user.controller/user.controller";
import { authenticateToken } from "@middlewares/authMiddleware";
import { validateCsrfToken } from "@middlewares/csrfMiddleware";
import { authorizeRoles } from "@middlewares/roleMiddleware";

import { Router } from "express";

const router = Router();

// Get current authenticated user profile
router.get("/me", authenticateToken, getCurrentUser);

// List all users (accessible to SUPERADMIN and ADMIN)
router.get(
  "/",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  users
);

// Assign stores and position to a user (accessible only to SUPERADMIN)
// This route modifies data, so we need CSRF validation
router.put(
  "/:userId/assign",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  updateUser
);

export default router;
