import { Router } from "express";
import authController from "../controllers/AuthController.js";
import { validateLogin, validateRegistro } from "../middlewares/validateAuth.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

router.post("/registro", validateRegistro, authController.registrar);
router.post("/login", validateLogin, authController.login);
router.post("/logout", requireAuth, authController.logout);
router.get("/yo", requireAuth, authController.yo);

export default router;
