import { del, post, request } from "./api.js";
import { authHeaders } from "./authService.js";

const RESOURCE = "/reservas";

// Todas las operaciones de reservas exigen sesión iniciada: el comprador sale
// de la sesión (token), no de un formulario.

// Compra: { idEvento, cantidadEntradas, pedido? }.
// Devuelve la reserva con sus entradas (cada una con su código) y el total.
export function createReserva(data) {
  return post(RESOURCE, data, authHeaders());
}

// "Mis entradas": las reservas del cliente con sesión iniciada.
export function getMisReservas() {
  return request(RESOURCE, authHeaders());
}

export function cancelarReserva(idReserva) {
  return del(`${RESOURCE}/${idReserva}`, authHeaders());
}
