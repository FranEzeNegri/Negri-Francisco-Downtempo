import "./setup.js";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import store from "../src/db/store.js";

// Tests de punta a punta: levantan la API en un puerto libre y le pegan por HTTP.
let server;
let baseUrl;

const api = async (path, { method = "GET", body, admin = false, token } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(admin ? { "x-admin-key": "clave-de-test" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });

    return { status: response.status, body: await response.json() };
};

// Registra un cliente y devuelve el token de su sesión.
const registrar = async (email = "ana@mail.com") => {
    const { body } = await api("/auth/registro", {
        method: "POST",
        body: { nombre: "Ana", email, password: "clave-segura" }
    });

    return body.data.token;
};

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://localhost:${server.address().port}/api`;
});

after(() => server.close());

beforeEach(() => store.reset());

describe("API pública", () => {
    it("GET /eventos responde con el formato { success, data }", async () => {
        const { status, body } = await api("/eventos");

        assert.equal(status, 200);
        assert.equal(body.success, true);
        assert.equal(body.data.length, 4);
    });

    it("GET /eventos valida los filtros", async () => {
        assert.equal((await api("/eventos?dj=abc")).status, 400);
        assert.equal((await api("/eventos?desde=ayer")).status, 400);
        assert.equal((await api("/eventos?dj=6")).body.data.length, 1);
    });

    it("flujo completo: registrarse, comprar, ver mis reservas, ver la entrada y cancelar", async () => {
        const token = await registrar();

        const compra = await api("/reservas", {
            method: "POST",
            token,
            body: { idEvento: 1, cantidadEntradas: 2, pedido: [{ idItem: 1, cantidad: 2 }] }
        });
        assert.equal(compra.status, 201);
        assert.equal(compra.body.data.email, "ana@mail.com");
        const { idReserva, entradas } = compra.body.data;

        const mias = await api("/reservas", { token });
        assert.equal(mias.body.data.length, 1);

        const entrada = await api(`/entradas/${entradas[0].codigo}`);
        assert.equal(entrada.body.data.estado, "valida");

        const cancelacion = await api(`/reservas/${idReserva}`, { method: "DELETE", token });
        assert.equal(cancelacion.status, 200);
        assert.equal(cancelacion.body.data.estado, "cancelada");

        const evento = await api("/eventos/1");
        assert.equal(evento.body.data.entradasDisponibles, 150);
    });

    it("POST /reservas valida el cuerpo", async () => {
        const token = await registrar();
        const base = { idEvento: 1, cantidadEntradas: 1 };
        const comprar = (body) => api("/reservas", { method: "POST", token, body });

        assert.equal((await comprar({ ...base, cantidadEntradas: 7 })).status, 400);
        assert.equal((await comprar({ ...base, idEvento: "uno" })).status, 400);
        assert.equal((await comprar({ ...base, pedido: [{ idItem: 1, cantidad: 0 }] })).status, 400);
        assert.equal((await comprar({ ...base, idEvento: 999 })).status, 404);
    });

    it("las reservas exigen sesión iniciada", async () => {
        const sinSesion = await api("/reservas");
        assert.equal(sinSesion.status, 401);
        assert.equal(sinSesion.body.success, false);

        assert.equal((await api("/reservas", { token: "token-inventado" })).status, 401);
        assert.equal(
            (await api("/reservas", { method: "POST", body: { idEvento: 1, cantidadEntradas: 1 } })).status,
            401
        );
        assert.equal((await api("/eventos/1")).body.data.entradasDisponibles, 150);
    });

    it("un cliente no puede ver ni cancelar la reserva de otro", async () => {
        const tokenAna = await registrar();
        const tokenBeto = await registrar("beto@mail.com");
        const compra = await api("/reservas", {
            method: "POST",
            token: tokenAna,
            body: { idEvento: 1, cantidadEntradas: 1 }
        });
        const { idReserva } = compra.body.data;

        assert.equal((await api("/reservas", { token: tokenBeto })).body.data.length, 0);
        assert.equal((await api(`/reservas/${idReserva}`, { token: tokenBeto })).status, 403);
        assert.equal((await api(`/reservas/${idReserva}`, { method: "DELETE", token: tokenBeto })).status, 403);
        assert.equal((await api(`/reservas/${idReserva}`, { token: tokenAna })).status, 200);
    });

    it("POST /djs/:id/like y /recomendaciones son públicos", async () => {
        const like = await api("/djs/1/like", { method: "POST" });
        assert.equal(like.body.data.cantidadLikes, 121);

        const recomendacion = await api("/djs/1/recomendaciones", {
            method: "POST",
            body: { tituloCancion: "Teardrop", artista: "Massive Attack" }
        });
        assert.equal(recomendacion.status, 201);
        assert.equal((await api("/djs/1/recomendaciones")).body.data.length, 1);
    });

    it("una ruta inexistente responde 404 con el formato de error", async () => {
        const { status, body } = await api("/no-existe");

        assert.equal(status, 404);
        assert.equal(body.success, false);
    });
});

describe("API de cuentas", () => {
    const ana = { nombre: "Ana", email: "ana@mail.com", password: "clave-segura" };

    it("registro, sesión actual, cierre de sesión e inicio de sesión", async () => {
        const registro = await api("/auth/registro", { method: "POST", body: ana });
        assert.equal(registro.status, 201);
        assert.equal("contraseña" in registro.body.data.cliente, false);

        const { token } = registro.body.data;
        assert.equal((await api("/auth/yo", { token })).body.data.email, "ana@mail.com");

        assert.equal((await api("/auth/logout", { method: "POST", token })).status, 200);
        assert.equal((await api("/auth/yo", { token })).status, 401);

        const login = await api("/auth/login", { method: "POST", body: { email: ana.email, password: ana.password } });
        assert.equal(login.status, 200);
        assert.equal((await api("/auth/yo", { token: login.body.data.token })).status, 200);
    });

    it("valida los datos del registro y no permite emails repetidos", async () => {
        const registrarCon = (extra) => api("/auth/registro", { method: "POST", body: { ...ana, ...extra } });

        assert.equal((await registrarCon({ nombre: "  " })).status, 400);
        assert.equal((await registrarCon({ email: "sin-arroba" })).status, 400);
        assert.equal((await registrarCon({ password: "corta" })).status, 400);
        assert.equal((await registrarCon({})).status, 201);
        assert.equal((await registrarCon({ email: "ANA@mail.com" })).status, 409);
    });

    it("rechaza el login con credenciales incorrectas", async () => {
        await api("/auth/registro", { method: "POST", body: ana });
        const login = (body) => api("/auth/login", { method: "POST", body });

        assert.equal((await login({ email: ana.email, password: "otra-clave" })).status, 401);
        assert.equal((await login({ email: "nadie@mail.com", password: ana.password })).status, 401);
        assert.equal((await login({ email: ana.email })).status, 400);
    });
});

describe("API de administración", () => {
    const item = { nombre: "Fernet", precio: 6000, categoria: "Cocktails" };

    it("rechaza las escrituras sin la clave de administrador", async () => {
        assert.equal((await api("/menu", { method: "POST", body: item })).status, 401);
        assert.equal((await api("/eventos/1", { method: "DELETE" })).status, 401);
        assert.equal((await api("/djs/1", { method: "DELETE" })).status, 401);
        assert.equal((await api("/admin/reservas")).status, 401);
        assert.equal((await api("/admin/login", { method: "POST" })).status, 401);
    });

    it("con la clave permite administrar el menú", async () => {
        assert.equal((await api("/admin/login", { method: "POST", admin: true })).status, 200);

        const creado = await api("/menu", { method: "POST", body: item, admin: true });
        assert.equal(creado.status, 201);

        const { idItem } = creado.body.data;
        const editado = await api(`/menu/${idItem}`, { method: "PUT", body: { ...item, precio: 6500 }, admin: true });
        assert.equal(editado.body.data.precio, 6500);

        assert.equal((await api(`/menu/${idItem}`, { method: "DELETE", admin: true })).status, 200);
        assert.equal((await api(`/menu/${idItem}`)).status, 404);
    });

    it("valida una entrada en la puerta una sola vez", async () => {
        const compra = await api("/reservas", {
            method: "POST",
            token: await registrar(),
            body: { idEvento: 1, cantidadEntradas: 1 }
        });
        const { codigo } = compra.body.data.entradas[0];

        assert.equal((await api(`/entradas/${codigo}/validar`, { method: "POST" })).status, 401);
        assert.equal((await api(`/entradas/${codigo}/validar`, { method: "POST", admin: true })).status, 200);
        assert.equal((await api(`/entradas/${codigo}/validar`, { method: "POST", admin: true })).status, 409);
        assert.equal((await api("/admin/reservas", { admin: true })).body.data.length, 1);
    });
});
