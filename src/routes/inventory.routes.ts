import {
  create,
  expiredProducts,
  getAllProductsWithInventory,
  inventoryMovementGroupedByBatch,
  inventoryMovementWithRunningBalance,
  lowStockProducts,
  read,
  read_Inventory_Items,
  readById,
  readInventoryToUpdate,
  remove,
  restore,
  salesInventoryProducts,
  update,
  // Report Management
  inventory_report,
  getInventoryReportFiles,
  downloadAndDeleteInventoryReport,
} from "@controllers/inventory.controller/inventory.controller";
import { authenticateToken } from "@middlewares/authMiddleware";
import { validateCsrfToken } from "@middlewares/csrfMiddleware";
import { authorizeRoles } from "@middlewares/roleMiddleware";

import { Router } from "express";

const router = Router();

//========================================================================================Report Management Routes
// Generate inventory report
router.get(
  "/report",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  inventory_report
);

// Get list of available inventory report files
router.get(
  "/report/files",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  getInventoryReportFiles
);

// Download and delete inventory report file
router.get(
  "/report/download/:filename",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  downloadAndDeleteInventoryReport
);

//========================================================================================

//Create
router.post(
  "/",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  create
);
//Read
router.get(
  "/",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  read
);

router.get(
  "/items",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  read_Inventory_Items
);

router.get(
  "/expired",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  expiredProducts
);

router.get(
  "/low-stock-products",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  lowStockProducts
);

router.get(
  "/products-with-inventory",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  getAllProductsWithInventory
);

//Inventory Movement Routes========================================================================================================================
router.get(
  "/inventory-movement-with-running-balance",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  inventoryMovementWithRunningBalance
);
router.get(
  "/inventory-movement-grouped-by-batch",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  inventoryMovementGroupedByBatch
);

//=================================================================================================================================================

router.get(
  "/:id",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  readById
);
router.get(
  "/product/:id",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  readInventoryToUpdate
);

//Update
router.put(
  "/:id",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  update
);

//Delete
router.delete(
  "/:id",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  remove
);

//Delete
router.post(
  "/:id",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  restore
);

//========================================================================================Zyre MS Route
router.get(
  "/sales-inventory-products",
  // authenticateToken,
  // authorizeRoles(["SUPERADMIN", "ADMIN"]),
  salesInventoryProducts
);
//========================================================================================

export default router;
