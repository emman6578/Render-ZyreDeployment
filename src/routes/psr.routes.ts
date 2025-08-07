import {
  read,
  read_PSR_from_HRMS,
  syncAndReadPSR,
} from "@controllers/psr.controller/psr.controller";
import { authenticateToken } from "@middlewares/authMiddleware";
import { validateCsrfToken } from "@middlewares/csrfMiddleware";
import { authorizeRoles } from "@middlewares/roleMiddleware";

import { Router } from "express";

const router = Router();

//Read
router.get(
  "/",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  read
);

router.get(
  "/hrms",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  read_PSR_from_HRMS
);

router.post(
  "/sync",
  authenticateToken,
  validateCsrfToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  syncAndReadPSR
);

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

export default router;
