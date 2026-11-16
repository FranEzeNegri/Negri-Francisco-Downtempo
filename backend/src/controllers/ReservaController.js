import reservaService from "../services/ReservaService.js";
import { successResponse } from "../responses/ApiResponse.js";
import { HttpStatus } from "../enums/HttpStatus.js";
import { Messages } from "../enums/Messages.js";

// req.cliente lo deja el middleware requireAuth (cliente con sesión iniciada).
class ReservaController {
    // Solo para el panel de administración.
    getAll(req, res) {
        return successResponse(res, reservaService.getAll());
    }

    getMias(req, res) {
        return successResponse(res, reservaService.getByCliente(req.cliente.idCliente));
    }

    getById(req, res) {
        return successResponse(res, reservaService.getById(Number(req.params.id), req.cliente.idCliente));
    }

    create(req, res) {
        const reserva = reservaService.create({ ...req.body, idCliente: req.cliente.idCliente });
        return successResponse(res, reserva, HttpStatus.CREATED, Messages.RESERVA_CREATED);
    }

    cancel(req, res) {
        const reserva = reservaService.cancel(Number(req.params.id), req.cliente.idCliente);
        return successResponse(res, reserva, HttpStatus.OK, Messages.RESERVA_CANCELADA);
    }
}

export default new ReservaController();
