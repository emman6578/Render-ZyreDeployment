"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const activity_log_controller_1 = require("@controllers/log.controller/activity.log.controller");
const inventory_price_change_controller_1 = require("@controllers/log.controller/inventory.price.change.controller");
const product_price_change_controller_1 = require("@controllers/log.controller/product.price.change.controller");
const authMiddleware_1 = require("@middlewares/authMiddleware");
const roleMiddleware_1 = require("@middlewares/roleMiddleware");
const express_1 = require("express");
const router = (0, express_1.Router)();
//ACTIVITY LOGS
router.get("/", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), activity_log_controller_1.read);
//PRODUCT PRICE LISTS
router.get("/product-price-change-history", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), product_price_change_controller_1.product_price_change_history_read);
//PRODUCT PRICE CHANGE BY PRODUCT ID
router.get("/product-price-change-history/:productId", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), product_price_change_controller_1.product_price_change_history_summary);
//INVENTORY PRICE CHANGE
router.get("/inventory-price-change-history", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_price_change_controller_1.inventory_price_change_history_read);
//INVENTORY PRICE CHANGE BY PRODUCT ID
router.get("/inventory-price-change-history/:batchNumber", authMiddleware_1.authenticateToken, (0, roleMiddleware_1.authorizeRoles)(["SUPERADMIN", "ADMIN"]), inventory_price_change_controller_1.inventory_price_change_history_summary);
exports.default = router;
