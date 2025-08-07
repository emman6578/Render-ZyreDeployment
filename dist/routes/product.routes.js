"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const product_controller_1 = require("@controllers/product.controller/product.controller");
const authMiddleware_1 = require("@middlewares/authMiddleware");
const csrfMiddleware_1 = require("@middlewares/csrfMiddleware");
const roleMiddleware_1 = require("@middlewares/roleMiddleware");
const uploadMiddleware_1 = require("@middlewares/uploadMiddleware");
const express_1 = require("express");
const router = (0, express_1.Router)();
//Create
router.post("/", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), uploadMiddleware_1.uploadProductImages.array("images", 50), // This expects field name 'images' for all files
product_controller_1.create);
//Read
router.get("/", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), product_controller_1.read);
router.get("/transaction-summary/:id", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), product_controller_1.readProductTransactionSummary);
router.get("/:id", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), product_controller_1.readById);
router.get("/product/:id", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), product_controller_1.readProductToUpdate);
//Update
router.put("/:id", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), uploadMiddleware_1.uploadProductImages.array("images", 1), // Expect image field
product_controller_1.update);
// //Delete
// router.delete(
//   "/:id",
//   authenticateToken,
//   authorizeRoles(["SUPERADMIN", "ADMIN"]),
//   remove
// );
exports.default = router;
