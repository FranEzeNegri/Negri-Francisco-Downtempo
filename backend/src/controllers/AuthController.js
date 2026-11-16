import authService from "../services/AuthService.js";
import { successResponse } from "../responses/ApiResponse.js";
import { HttpStatus } from "../enums/HttpStatus.js";
import { Messages } from "../enums/Messages.js";

class AuthController {
    registrar(req, res) {
        const sesion = authService.registrar(req.body);
        return successResponse(res, sesion, HttpStatus.CREATED, Messages.CLIENTE_REGISTRADO);
    }

    login(req, res) {
        const sesion = authService.login(req.body);
        return successResponse(res, sesion, HttpStatus.OK, Messages.LOGIN_OK);
    }

    logout(req, res) {
        authService.logout(req.token);
        return successResponse(res, null, HttpStatus.OK, Messages.LOGOUT_OK);
    }

    // El cliente de la sesión actual (lo dejó requireAuth en req.cliente).
    yo(req, res) {
        return successResponse(res, req.cliente);
    }
}

export default new AuthController();
