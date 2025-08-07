import { read } from "@controllers/log.controller/activity.log.controller";
import {
  inventory_price_change_history_read,
  inventory_price_change_history_summary,
} from "@controllers/log.controller/inventory.price.change.controller";
import {
  product_price_change_history_read,
  product_price_change_history_summary,
} from "@controllers/log.controller/product.price.change.controller";
import { authenticateToken } from "@middlewares/authMiddleware";
import { authorizeRoles } from "@middlewares/roleMiddleware";

import { Router } from "express";

const router = Router();

//ACTIVITY LOGS
router.get(
  "/",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  read
);

//PRODUCT PRICE LISTS
router.get(
  "/product-price-change-history",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  product_price_change_history_read
);

//PRODUCT PRICE CHANGE BY PRODUCT ID
router.get(
  "/product-price-change-history/:productId",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  product_price_change_history_summary
);

//INVENTORY PRICE CHANGE
router.get(
  "/inventory-price-change-history",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  inventory_price_change_history_read
);

//INVENTORY PRICE CHANGE BY PRODUCT ID
router.get(
  "/inventory-price-change-history/:batchNumber",
  authenticateToken,
  authorizeRoles(["SUPERADMIN", "ADMIN"]),
  inventory_price_change_history_summary
);

export default router;
