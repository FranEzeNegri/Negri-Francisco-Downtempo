import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

// Las contraseñas nunca se guardan en texto plano: se guarda "salt:hash",
// donde el hash se calcula con scrypt y una salt aleatoria por cliente.
export const hashPassword = (password) => {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

    return `${salt}:${hash}`;
};

export const verifyPassword = (password, guardada) => {
    const [salt, hash] = guardada.split(":");
    const esperado = Buffer.from(hash, "hex");
    const recibido = scryptSync(password, salt, KEY_LENGTH);

    return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
};
