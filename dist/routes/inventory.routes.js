"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inventory_controller_1 = require("@controllers/inventory.controller/inventory.controller");
const authMiddleware_1 = require("@middlewares/authMiddleware");
const csrfMiddleware_1 = require("@middlewares/csrfMiddleware");
const roleMiddleware_1 = require("@middlewares/roleMiddleware");
const express_1 = require("express");
const router = (0, express_1.Router)();
//========================================================================================Report Management Routes
// Generate inventory report
router.get("/report", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.inventory_report);
// Get list of available inventory report files
router.get("/report/files", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.getInventoryReportFiles);
// Download and delete inventory report file
router.get("/report/download/:filename", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.downloadAndDeleteInventoryReport);
//========================================================================================
//Create
router.post("/", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.create);
//Read
router.get("/", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.read);
router.get("/items", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.read_Inventory_Items);
router.get("/expired", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.expiredProducts);
router.get("/low-stock-products", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.lowStockProducts);
router.get("/products-with-inventory", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.getAllProductsWithInventory);
//Inventory Movement Routes========================================================================================================================
router.get("/inventory-movement", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.inventoryMovementREAD);
router.get("/inventory-movement-grouped-by-batch", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.inventoryMovementGroupedByBatch);
//=================================================================================================================================================
router.get("/:id", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.readById);
router.get("/product/:id", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.readInventoryToUpdate);
//Update
router.put("/:id", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.update);
//Delete
router.delete("/:id", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.remove);
//Delete
router.post("/:id", authMiddleware_1.authenticateToken, csrfMiddleware_1.validateCsrfToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_controller_1.restore);
//========================================================================================Zyre MS Route
router.get("/sales-inventory-products", 
// authenticateToken,
// authorizeRoles(["SUPERADMIN", "ADMIN"]),
inventory_controller_1.salesInventoryProducts);
//========================================================================================
exports.default = router;
