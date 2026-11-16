import "./setup.js";
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import store from "../src/db/store.js";
import reservaService from "../src/services/ReservaService.js";
import eventoService from "../src/services/EventoService.js";
import entradaService from "../src/services/EntradaService.js";
import authService from "../src/services/AuthService.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../src/exceptions/AppError.js";
import { Messages } from "../src/enums/Messages.js";
import { diasDesdeHoy } from "../src/utils/fechas.js";

const registrar = (nombre, email) => authService.registrar({ nombre, email, password: "clave-segura" }).cliente;

// Cliente con sesión que hace las compras de cada test.
let ana;

const compra = (extra = {}) => ({
    idCliente: ana.idCliente,
    idEvento: 1,
    cantidadEntradas: 2,
    ...extra
});

const conMensaje = (ErrorClass, message) => (error) => error instanceof ErrorClass && error.message === message;

beforeEach(() => {
    store.reset();
    ana = registrar("  Ana Pérez ", "  ANA@mail.com ");
});

describe("ReservaService.create", () => {
    it("descuenta el cupo y genera un código único por entrada", () => {
        const reserva = reservaService.create(compra({ cantidadEntradas: 3 }));

        assert.equal(reserva.entradas.length, 3);
        assert.equal(new Set(reserva.entradas.map((e) => e.codigo)).size, 3);
        reserva.entradas.forEach((entrada) => assert.match(entrada.codigo, /^DT-[A-Z2-9]{6}$/));
        assert.equal(eventoService.getById(1).entradasDisponibles, 147);
    });

    it("normaliza nombre y email, y calcula el total", () => {
        const reserva = reservaService.create(compra());

        assert.equal(reserva.nombreCliente, "Ana Pérez");
        assert.equal(reserva.email, "ana@mail.com");
        assert.equal(reserva.estado, "confirmada");
        assert.equal(reserva.total, 16000);
    });

    it("rechaza la compra de un cliente que no existe y no descuenta cupo", () => {
        assert.throws(
            () => reservaService.create(compra({ idCliente: 999 })),
            conMensaje(NotFoundError, Messages.CLIENTE_NOT_FOUND)
        );
        assert.equal(eventoService.getById(1).entradasDisponibles, 150);
    });

    it("suma el pre-pedido del menú al total y junta ítems repetidos", () => {
        const reserva = reservaService.create(
            compra({
                pedido: [
                    { idItem: 1, cantidad: 1 },
                    { idItem: 1, cantidad: 1 },
                    { idItem: 4, cantidad: 2 }
                ]
            })
        );

        assert.deepEqual(reserva.pedido, [
            { idItem: 1, nombre: "Negroni de la casa", precio: 7500, cantidad: 2 },
            { idItem: 4, nombre: "IPA artesanal", precio: 5500, cantidad: 2 }
        ]);
        assert.equal(reserva.totalPedido, 26000);
        assert.equal(reserva.total, 16000 + 26000);
    });

    it("rechaza un pedido con ítems que no están en el menú y no descuenta cupo", () => {
        assert.throws(
            () => reservaService.create(compra({ pedido: [{ idItem: 999, cantidad: 1 }] })),
            conMensaje(BadRequestError, Messages.PEDIDO_ITEM_NOT_FOUND)
        );
        assert.equal(eventoService.getById(1).entradasDisponibles, 150);
    });

    it("rechaza la compra si no alcanza el cupo", () => {
        store.get("eventos").find((evento) => evento.idEvento === 1).entradasDisponibles = 1;

        assert.throws(() => reservaService.create(compra()), conMensaje(ConflictError, Messages.SIN_CUPO));
        assert.equal(eventoService.getById(1).entradasDisponibles, 1);
    });

    it("rechaza la compra para un evento que ya pasó", () => {
        store.get("eventos").find((evento) => evento.idEvento === 1).fecha = diasDesdeHoy(-1);

        assert.throws(() => reservaService.create(compra()), conMensaje(BadRequestError, Messages.EVENTO_PASADO));
    });

    it("rechaza la compra para un evento inexistente", () => {
        assert.throws(() => reservaService.create(compra({ idEvento: 999 })), NotFoundError);
    });
});

describe("ReservaService.getByCliente", () => {
    it("devuelve solo las reservas de ese cliente, de la más nueva a la más vieja", () => {
        const otro = registrar("Beto", "beto@mail.com");
        const primera = reservaService.create(compra());
        const segunda = reservaService.create(compra({ idEvento: 2 }));
        reservaService.create(compra({ idCliente: otro.idCliente }));

        const reservas = reservaService.getByCliente(ana.idCliente);

        assert.deepEqual(
            reservas.map((reserva) => reserva.idReserva),
            [segunda.idReserva, primera.idReserva]
        );
    });

    it("devuelve una lista vacía si el cliente no tiene compras", () => {
        assert.deepEqual(reservaService.getByCliente(ana.idCliente), []);
    });

    it("no deja ver el detalle de una reserva de otro cliente", () => {
        const otro = registrar("Beto", "beto@mail.com");
        const reserva = reservaService.create(compra());

        assert.equal(reservaService.getById(reserva.idReserva, ana.idCliente).idReserva, reserva.idReserva);
        assert.throws(
            () => reservaService.getById(reserva.idReserva, otro.idCliente),
            conMensaje(ForbiddenError, Messages.RESERVA_AJENA)
        );
    });
});

describe("ReservaService.cancel", () => {
    it("cancela la reserva y devuelve las entradas al cupo", () => {
        const reserva = reservaService.create(compra());

        const cancelada = reservaService.cancel(reserva.idReserva, ana.idCliente);

        assert.equal(cancelada.estado, "cancelada");
        assert.equal(eventoService.getById(1).entradasDisponibles, 150);
    });

    it("no deja cancelar la reserva de otro cliente", () => {
        const otro = registrar("Beto", "beto@mail.com");
        const reserva = reservaService.create(compra());

        assert.throws(
            () => reservaService.cancel(reserva.idReserva, otro.idCliente),
            conMensaje(ForbiddenError, Messages.RESERVA_AJENA)
        );
        assert.equal(eventoService.getById(1).entradasDisponibles, 148);
    });

    it("no deja cancelar dos veces (el cupo no se devuelve doble)", () => {
        const reserva = reservaService.create(compra());
        reservaService.cancel(reserva.idReserva, ana.idCliente);

        assert.throws(
            () => reservaService.cancel(reserva.idReserva, ana.idCliente),
            conMensaje(ConflictError, Messages.RESERVA_YA_CANCELADA)
        );
        assert.equal(eventoService.getById(1).entradasDisponibles, 150);
    });

    it("no deja cancelar si alguna entrada ya se usó", () => {
        const reserva = reservaService.create(compra());
        entradaService.validar(reserva.entradas[0].codigo);

        assert.throws(
            () => reservaService.cancel(reserva.idReserva, ana.idCliente),
            conMensaje(ConflictError, Messages.RESERVA_NO_CANCELABLE_USADA)
        );
    });

    it("no deja cancelar una reserva de un evento que ya pasó", () => {
        const reserva = reservaService.create(compra());
        store.get("eventos").find((evento) => evento.idEvento === 1).fecha = diasDesdeHoy(-1);

        assert.throws(
            () => reservaService.cancel(reserva.idReserva, ana.idCliente),
            conMensaje(ConflictError, Messages.RESERVA_NO_CANCELABLE_PASADA)
        );
    });
});

describe("EntradaService", () => {
    it("consulta una entrada por código sin importar mayúsculas ni espacios", () => {
        const reserva = reservaService.create(compra());
        const { codigo } = reserva.entradas[0];

        const entrada = entradaService.getByCodigo(` ${codigo.toLowerCase()} `);

        assert.equal(entrada.codigo, codigo);
        assert.equal(entrada.estado, "valida");
        assert.equal(entrada.evento.nombre, "Sunset Sessions");
    });

    it("valida una entrada una sola vez", () => {
        const reserva = reservaService.create(compra());
        const { codigo } = reserva.entradas[0];

        assert.equal(entradaService.validar(codigo).estado, "usada");
        assert.throws(() => entradaService.validar(codigo), conMensaje(ConflictError, Messages.ENTRADA_YA_USADA));
    });

    it("no valida entradas de una reserva cancelada", () => {
        const reserva = reservaService.create(compra());
        reservaService.cancel(reserva.idReserva, ana.idCliente);

        assert.throws(
            () => entradaService.validar(reserva.entradas[0].codigo),
            conMensaje(ConflictError, Messages.ENTRADA_CANCELADA)
        );
    });

    it("avisa cuando el código no existe", () => {
        assert.throws(() => entradaService.getByCodigo("DT-NOEXIS"), NotFoundError);
    });
});
