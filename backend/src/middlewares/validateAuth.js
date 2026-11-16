import { BadRequestError } from "../exceptions/AppError.js";
import { Messages } from "../enums/Messages.js";
import { isNonEmptyString, isPlainObject, isValidEmail } from "../utils/validators.js";

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;

export const validateRegistro = (req, res, next) => {
    const body = req.body;

    if (!isPlainObject(body)) {
        throw new BadRequestError(Messages.INVALID_DATA);
    }

    const { nombre, email, password } = body;

    if (!isNonEmptyString(nombre)) {
        throw new BadRequestError(Messages.INVALID_NOMBRE);
    }

    if (!isValidEmail(email)) {
        throw new BadRequestError(Messages.INVALID_EMAIL);
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
        throw new BadRequestError(Messages.INVALID_PASSWORD);
    }

    next();
};

export const validateLogin = (req, res, next) => {
    const body = req.body;

    if (!isPlainObject(body)) {
        throw new BadRequestError(Messages.INVALID_DATA);
    }

    if (!isValidEmail(body.email)) {
        throw new BadRequestError(Messages.INVALID_EMAIL);
    }

    if (typeof body.password !== "string" || body.password.length === 0 || body.password.length > MAX_PASSWORD) {
        throw new BadRequestError(Messages.PASSWORD_REQUERIDA);
    }

    next();
};
