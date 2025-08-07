import {
  create,
  read,
} from "@controllers/collections.controller/collections.controller";
import { authenticateToken } from "@middlewares/authMiddleware";
import { validateCsrfToken } from "@middlewares/csrfMiddleware";
import { authorizeRoles } from "@middlewares/roleMiddleware";

import { Router } from "express";

const router = Router();

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

// //Read by id
// router.get(
//   "/:id",
//   authenticateToken,
//   authorizeRoles(["SUPERADMIN", "ADMIN"]),
//   readById
// );
// //Update
// router.put(
//   "/:id",
//  validateCsrfToken,
//   authenticateToken,
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
