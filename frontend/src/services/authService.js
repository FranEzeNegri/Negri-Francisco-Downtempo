import { post, request } from "./api.js";

const TOKEN_KEY = "downtempo:token";

function leerToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function guardarToken(valor) {
  token = valor;

  try {
    if (valor) localStorage.setItem(TOKEN_KEY, valor);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Sin storage la sesión dura hasta recargar la página.
  }
}

// Token de la sesión del cliente. Se guarda en este navegador para que la
// sesión sobreviva a recargar la página.
let token = leerToken();

export const hayToken = () => Boolean(token);

// Opciones de fetch con el token del cliente: lo usan los servicios cuyas
// rutas exigen sesión iniciada (reservas).
export const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

// Crea la cuenta y deja la sesión iniciada. Devuelve el cliente.
export async function registrar({ nombre, email, password }) {
  const sesion = await post("/auth/registro", { nombre, email, password });
  guardarToken(sesion.token);
  return sesion.cliente;
}

export async function iniciarSesion({ email, password }) {
  const sesion = await post("/auth/login", { email, password });
  guardarToken(sesion.token);
  return sesion.cliente;
}

// Cierra la sesión en el backend y borra el token local aunque el pedido falle.
export async function cerrarSesion() {
  try {
    await post("/auth/logout", undefined, authHeaders());
  } catch {
    // Si la sesión ya había vencido no hay nada más que cerrar.
  } finally {
    guardarToken("");
  }
}

// Borra el token sin avisar al backend (cuando el backend ya dijo que no sirve).
export function olvidarSesion() {
  guardarToken("");
}

// Cliente de la sesión guardada; falla con 401 si el token venció.
export function getCliente() {
  return request("/auth/yo", authHeaders());
}
