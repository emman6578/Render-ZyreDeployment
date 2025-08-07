import { readInventoryToUpdate } from "@controllers/inventory.controller/inventory.controller";
import {
  create,
  read,
  update,
  remove,
  readById,
  read_purchaseToInventory,
  read_purchaseToUpdate,
  create_purchase_return,
  verify,
  read_purchaseReturnList,
  read_purchaseEditLists,
  update_status_purchase_return,
  purchase_report,
  getReportFiles,
  downloadAndDeleteReport,
} from "@controllers/purchase.controller/purchase.controller";
import { authenticateToken } from "@middlewares/authMiddleware";
import { validateCsrfToken } from "@middlewares/csrfMiddleware";
import { authorizeRoles } from "@middlewares/roleMiddleware";

import { Router } from "express";

const router = Router();

//REPORT MANAGEMENT
router.get(
  "/report",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  purchase_report
);

router.get(
  "/report/files",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  getReportFiles
);

router.get(
  "/report/download/:filename",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  downloadAndDeleteReport
);

//Create
router.post(
  "/",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  create
);
//Create Purchase Return
router.post(
  "/return",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  create_purchase_return
);
//Update Purchase Return STATUS
router.put(
  "/return/status",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  update_status_purchase_return
);
//Read
router.get(
  "/",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  read
);
//READ Purchase to be added to inventory
router.get(
  "/toInventory",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  read_purchaseToInventory
);
router.get(
  "/purchaseToUpdate/:id",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  read_purchaseToUpdate
);
router.get(
  "/return",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  read_purchaseReturnList
);
router.get(
  "/edit",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  read_purchaseEditLists
);
//READ by id
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  readById
);
//Update
router.put(
  "/verify/:id",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  verify
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

export default router;
