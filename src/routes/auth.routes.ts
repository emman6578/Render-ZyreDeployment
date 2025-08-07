import { Router } from "express";
import {
  login,
  logout,
  refreshCsrfToken,
  register,
} from "@controllers/auth.controller/auth.controller";
import { authenticateToken } from "@middlewares/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/refresh-csrf", authenticateToken, refreshCsrfToken);
router.post("/login", login);
router.post("/logout", authenticateToken, logout);

export default router;
