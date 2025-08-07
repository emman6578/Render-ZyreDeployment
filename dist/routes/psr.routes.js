"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const psr_controller_1 = require("@controllers/psr.controller/psr.controller");
const authMiddleware_1 = require("@middlewares/authMiddleware");
const csrfMiddleware_1 = require("@middlewares/csrfMiddleware");
const roleMiddleware_1 = require("@middlewares/roleMiddleware");
const express_1 = require("express");
const router = (0, express_1.Router)();
//Read
router.get("/", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), psr_controller_1.read);
router.get("/hrms", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), psr_controller_1.read_PSR_from_HRMS);
router.post("/sync", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), psr_controller_1.syncAndReadPSR);
// //Create
// router.post(
//   "/",
//   authenticateToken,
//  validateCsrfToken,
//   authorizeRoles(["SUPERADMIN", "ADMIN"]),
//   create
// );
// router.get(
//   "/:id",
//   authenticateToken,
//   authorizeRoles(["SUPERADMIN", "ADMIN"]),
//   readById
// );
// //Update
// router.put(
//   "/:id",
//   authenticateToken,
//  validateCsrfToken,
//   authorizeRoles(["SUPERADMIN", "ADMIN"]),
//   update
// );
// //Delete
// router.delete(
//   "/:id",
//   authenticateToken,
//  validateCsrfToken,
//   authorizeRoles(["SUPERADMIN", "ADMIN"]),
//   remove
// );
exports.default = router;
