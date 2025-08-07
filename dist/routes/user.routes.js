"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_controller_1 = require("@controllers/user.controller/user.controller");
const authMiddleware_1 = require("@middlewares/authMiddleware");
const csrfMiddleware_1 = require("@middlewares/csrfMiddleware");
const roleMiddleware_1 = require("@middlewares/roleMiddleware");
const express_1 = require("express");
const router = (0, express_1.Router)();
// Get current authenticated user profile
router.get("/me", authMiddleware_1.authenticateToken, user_controller_1.getCurrentUser);
// List all users (accessible to SUPERADMIN and ADMIN)
router.get("/", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), user_controller_1.users);
// Assign stores and position to a user (accessible only to SUPERADMIN)
// This route modifies data, so we need CSRF validation
router.put("/:userId/assign", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), user_controller_1.updateUser);
exports.default = router;
