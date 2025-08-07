import { read } from "@controllers/sales.controller/customer.controller";
import { authenticateToken } from "@middlewares/authMiddleware";
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
