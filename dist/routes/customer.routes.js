"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const customer_controller_1 = require("@controllers/sales.controller/customer.controller");
const authMiddleware_1 = require("@middlewares/authMiddleware");
const roleMiddleware_1 = require("@middlewares/roleMiddleware");
const express_1 = require("express");
const router = (0, express_1.Router)();
//Read
router.get("/", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), customer_controller_1.read);
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
