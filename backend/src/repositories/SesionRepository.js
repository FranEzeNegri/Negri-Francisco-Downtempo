import { randomBytes } from "node:crypto";
import Sesion from "../models/Sesion.js";
import store from "../db/store.js";

class SesionRepository {
    findAll() {
        return store.get("sesiones");
    }

    findByToken(token) {
        return this.findAll().find((sesion) => sesion.token === token);
    }

    // El token es aleatorio e imposible de adivinar (32 bytes).
    create(idCliente, expira) {
        const sesion = new Sesion(randomBytes(32).toString("hex"), idCliente, expira);
        this.findAll().push(sesion);
        store.save();
        return sesion;
    }

    delete(token) {
        const sesiones = this.findAll();
        const index = sesiones.findIndex((sesion) => sesion.token === token);

        if (index !== -1) {
            sesiones.splice(index, 1);
            store.save();
        }
    }
}

export default new SesionRepository();
