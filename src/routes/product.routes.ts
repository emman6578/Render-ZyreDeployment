import {
  create,
  read,
  readById,
  readProductToUpdate,
  readProductTransactionSummary,
  update,
} from "@controllers/product.controller/product.controller";
import { authenticateToken } from "@middlewares/authMiddleware";
import { validateCsrfToken } from "@middlewares/csrfMiddleware";
import { authorizeRoles } from "@middlewares/roleMiddleware";
import { uploadProductImages } from "@middlewares/uploadMiddleware";

import { Router } from "express";

const router = Router();

//Create
router.post(
  "/",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  uploadProductImages.array("images", 50), // This expects field name 'images' for all files
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
  "/transaction-summary/:id",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  readProductTransactionSummary
);

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
  readProductToUpdate
);

//Update
router.put(
  "/:id",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  uploadProductImages.array("images", 1), // Expect image field
  update
);

// //Delete
// router.delete(
//   "/:id",
//   authenticateToken,
//   authorizeRoles(["SUPERADMIN", "ADMIN"]),
//   remove
// );

export default router;
