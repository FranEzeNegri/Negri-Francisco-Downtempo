import clienteRepository from "../repositories/ClienteRepository.js";
import sesionRepository from "../repositories/SesionRepository.js";
import { ConflictError, UnauthorizedError } from "../exceptions/AppError.js";
import { Messages } from "../enums/Messages.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

class AuthService {
    // Alta de un cliente. No puede haber dos cuentas con el mismo email.
    // Devuelve la sesión ya iniciada: { token, cliente }.
    registrar({ nombre, email, password }) {
        const emailNormalizado = this.#normalizarEmail(email);

        if (clienteRepository.findByEmail(emailNormalizado)) {
            throw new ConflictError(Messages.EMAIL_DUPLICADO);
        }

        const cliente = clienteRepository.create({
            nombre: nombre.trim(),
            email: emailNormalizado,
            contraseña: hashPassword(password)
        });

        return this.#abrirSesion(cliente);
    }

    // El mensaje es el mismo si falla el email o la contraseña, para no
    // revelar qué emails tienen cuenta.
    login({ email, password }) {
        const cliente = clienteRepository.findByEmail(this.#normalizarEmail(email));

        if (!cliente?.contraseña || !verifyPassword(password, cliente.contraseña)) {
            throw new UnauthorizedError(Messages.CREDENCIALES_INVALIDAS);
        }

        return this.#abrirSesion(cliente);
    }

    logout(token) {
        sesionRepository.delete(token);
    }

    // Devuelve el cliente dueño del token, o falla si la sesión no existe o
    // venció. Lo usa el middleware requireAuth en cada ruta protegida.
    autenticar(token) {
        const sesion = token ? sesionRepository.findByToken(token) : undefined;

        if (!sesion) {
            throw new UnauthorizedError(Messages.SESION_REQUERIDA);
        }

        const cliente = clienteRepository.findById(sesion.idCliente);

        if (!cliente || sesion.expira < new Date().toISOString()) {
            sesionRepository.delete(token);
            throw new UnauthorizedError(Messages.SESION_VENCIDA);
        }

        return this.#publico(cliente);
    }

    #abrirSesion(cliente) {
        const expira = new Date(Date.now() + DURACION_SESION_MS).toISOString();
        const sesion = sesionRepository.create(cliente.idCliente, expira);

        return { token: sesion.token, cliente: this.#publico(cliente) };
    }

    // Los datos del cliente que pueden salir del backend: nunca la contraseña.
    #publico({ idCliente, nombre, email, fechaRegistro }) {
        return { idCliente, nombre, email, fechaRegistro };
    }

    #normalizarEmail(email) {
        return email.trim().toLowerCase();
    }
}

export default new AuthService();
