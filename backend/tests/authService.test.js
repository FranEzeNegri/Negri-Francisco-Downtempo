import "./setup.js";
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import store from "../src/db/store.js";
import authService from "../src/services/AuthService.js";
import eventoService from "../src/services/EventoService.js";
import { ConflictError, UnauthorizedError } from "../src/exceptions/AppError.js";
import { Messages } from "../src/enums/Messages.js";
import { diasDesdeHoy } from "../src/utils/fechas.js";

const ana = { nombre: "  Ana Pérez ", email: "  ANA@mail.com ", password: "clave-segura" };

const conMensaje = (ErrorClass, message) => (error) => error instanceof ErrorClass && error.message === message;

beforeEach(() => store.reset());

describe("AuthService.registrar", () => {
    it("crea el cliente, normaliza sus datos y devuelve la sesión iniciada", () => {
        const { token, cliente } = authService.registrar(ana);

        assert.match(token, /^[0-9a-f]{64}$/);
        assert.equal(cliente.nombre, "Ana Pérez");
        assert.equal(cliente.email, "ana@mail.com");
        assert.deepEqual(authService.autenticar(token), cliente);
    });

    it("guarda la contraseña hasheada y nunca la devuelve", () => {
        const { cliente } = authService.registrar(ana);
        const guardado = store.get("clientes")[0];

        assert.equal("contraseña" in cliente, false);
        assert.notEqual(guardado.contraseña, ana.password);
        assert.equal(guardado.contraseña.includes(ana.password), false);
    });

    it("no permite dos cuentas con el mismo email (sin importar mayúsculas)", () => {
        authService.registrar(ana);

        assert.throws(
            () => authService.registrar({ ...ana, nombre: "Otra", email: "ana@MAIL.com" }),
            conMensaje(ConflictError, Messages.EMAIL_DUPLICADO)
        );
        assert.equal(store.get("clientes").length, 1);
    });
});

describe("AuthService.login", () => {
    beforeEach(() => authService.registrar(ana));

    it("inicia sesión con el email y la contraseña correctos", () => {
        const { token, cliente } = authService.login({ email: "Ana@Mail.com", password: ana.password });

        assert.equal(cliente.email, "ana@mail.com");
        assert.equal(authService.autenticar(token).idCliente, cliente.idCliente);
    });

    it("rechaza una contraseña incorrecta o un email sin cuenta con el mismo mensaje", () => {
        assert.throws(
            () => authService.login({ email: "ana@mail.com", password: "otra-clave" }),
            conMensaje(UnauthorizedError, Messages.CREDENCIALES_INVALIDAS)
        );
        assert.throws(
            () => authService.login({ email: "nadie@mail.com", password: ana.password }),
            conMensaje(UnauthorizedError, Messages.CREDENCIALES_INVALIDAS)
        );
    });
});

describe("AuthService.autenticar", () => {
    it("rechaza un token inexistente o ausente", () => {
        assert.throws(() => authService.autenticar("no-existe"), conMensaje(UnauthorizedError, Messages.SESION_REQUERIDA));
        assert.throws(() => authService.autenticar(undefined), conMensaje(UnauthorizedError, Messages.SESION_REQUERIDA));
    });

    it("después de cerrar sesión el token deja de servir", () => {
        const { token } = authService.registrar(ana);

        authService.logout(token);

        assert.throws(() => authService.autenticar(token), UnauthorizedError);
    });

    it("rechaza una sesión vencida y la borra", () => {
        const { token } = authService.registrar(ana);
        store.get("sesiones")[0].expira = new Date(Date.now() - 1000).toISOString();

        assert.throws(() => authService.autenticar(token), conMensaje(UnauthorizedError, Messages.SESION_VENCIDA));
        assert.equal(store.get("sesiones").length, 0);
    });
});

describe("EventoService: fechas duplicadas", () => {
    const evento = (extra = {}) => ({
        nombre: "Noche nueva",
        fecha: diasDesdeHoy(40),
        horaInicio: "22:00",
        horaFin: "04:00",
        capacidadMaxima: 50,
        precio: 5000,
        ...extra
    });

    it("no permite crear dos eventos en la misma fecha", () => {
        eventoService.create(evento());

        assert.throws(
            () => eventoService.create(evento({ nombre: "Otra noche" })),
            conMensaje(ConflictError, Messages.EVENTO_FECHA_OCUPADA)
        );
    });

    it("no permite mover un evento a una fecha ocupada, pero sí editarlo en la suya", () => {
        const creado = eventoService.create(evento());

        assert.equal(eventoService.update(creado.idEvento, evento({ precio: 6000 })).precio, 6000);
        assert.throws(
            () => eventoService.update(creado.idEvento, evento({ fecha: diasDesdeHoy(3) })),
            conMensaje(ConflictError, Messages.EVENTO_FECHA_OCUPADA)
        );
    });
});
