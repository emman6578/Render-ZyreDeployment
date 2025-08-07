"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const purchase_controller_1 = require("@controllers/purchase.controller/purchase.controller");
const authMiddleware_1 = require("@middlewares/authMiddleware");
const csrfMiddleware_1 = require("@middlewares/csrfMiddleware");
const roleMiddleware_1 = require("@middlewares/roleMiddleware");
const express_1 = require("express");
const router = (0, express_1.Router)();
//REPORT MANAGEMENT
router.get("/report", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.purchase_report);
router.get("/report/files", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.getReportFiles);
router.get("/report/download/:filename", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.downloadAndDeleteReport);
//Create
router.post("/", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.create);
//Create Purchase Return
router.post("/return", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.create_purchase_return);
//Update Purchase Return STATUS
router.put("/return/status", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.update_status_purchase_return);
//Read
router.get("/", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.read);
//READ Purchase to be added to inventory
router.get("/toInventory", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.read_purchaseToInventory);
router.get("/purchaseToUpdate/:id", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.read_purchaseToUpdate);
router.get("/return", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.read_purchaseReturnList);
router.get("/edit", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.read_purchaseEditLists);
//READ by id
router.get("/:id", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.readById);
//Update
router.put("/verify/:id", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.verify);
//Update
router.put("/:id", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.update);
//Delete
router.delete("/:id", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), purchase_controller_1.remove);
exports.default = router;
