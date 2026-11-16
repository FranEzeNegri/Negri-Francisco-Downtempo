import { BadRequestError } from "../exceptions/AppError.js";
import { Messages } from "../enums/Messages.js";
import { isPlainObject, isPositiveInteger } from "../utils/validators.js";

export const MAX_ENTRADAS_POR_COMPRA = 6;
export const MAX_UNIDADES_POR_ITEM = 10;

const isLineaDePedido = (linea) => {
    return (
        isPlainObject(linea) &&
        isPositiveInteger(linea.idItem) &&
        isPositiveInteger(linea.cantidad) &&
        linea.cantidad <= MAX_UNIDADES_POR_ITEM
    );
};

// El comprador no viaja en el cuerpo: sale de la sesión (ver requireAuth).
export const validateReserva = (req, res, next) => {
    const body = req.body;

    if (!isPlainObject(body)) {
        throw new BadRequestError(Messages.INVALID_DATA);
    }

    const { idEvento, cantidadEntradas, pedido } = body;

    if (!isPositiveInteger(idEvento)) {
        throw new BadRequestError(Messages.INVALID_ID_EVENTO);
    }

    if (!isPositiveInteger(cantidadEntradas) || cantidadEntradas > MAX_ENTRADAS_POR_COMPRA) {
        throw new BadRequestError(Messages.INVALID_CANTIDAD_ENTRADAS);
    }

    if (pedido !== undefined && (!Array.isArray(pedido) || !pedido.every(isLineaDePedido))) {
        throw new BadRequestError(Messages.INVALID_PEDIDO);
    }

    next();
};
