"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const district_controller_1 = require("@controllers/inventory.controller/district.controller");
const authMiddleware_1 = require("@middlewares/authMiddleware");
const csrfMiddleware_1 = require("@middlewares/csrfMiddleware");
const roleMiddleware_1 = require("@middlewares/roleMiddleware");
const express_1 = require("express");
const router = (0, express_1.Router)();
//Create
router.post("/", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), district_controller_1.create);
//Read
router.get("/", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), district_controller_1.read);
router.get("/:id", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), district_controller_1.readById);
//Update
router.put("/:id", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), district_controller_1.update);
//Delete
router.delete("/:id", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), district_controller_1.remove);
exports.default = router;
// router.get("/", CheckApiKEY, read);
