import { Router } from "express";
import reservaController from "../controllers/ReservaController.js";
import { validateId } from "../middlewares/validateId.js";
import { validateReserva } from "../middlewares/validateReserva.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Todas las operaciones sobre reservas necesitan una sesión iniciada: cada
// cliente compra a su nombre y solo ve y cancela sus propias reservas.
router.use(requireAuth);

router.get("/", reservaController.getMias);
router.get("/:id", validateId, reservaController.getById);
router.post("/", validateReserva, reservaController.create);
router.delete("/:id", validateId, reservaController.cancel);

export default router;
