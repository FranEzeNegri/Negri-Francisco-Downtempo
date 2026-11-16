# Guion del video (objetivo: unos 8:45; el máximo es 10)

**Flujo elegido:** lo que hace el cliente con sus entradas, de punta a punta:
**crear cuenta e ingresar → comprar → ver sus entradas con el QR → cancelar**.
El control de puerta del admin es solo el cierre del recorrido.

Antes de grabar: `cd backend && npm run seed`, después `npm run dev` en
`backend/` y `npm run dev` en `frontend/`. Tené abiertos en el editor los
archivos de cada bloque. Clave del admin: `downtempo-admin`.

---

## 0:00 – 0:30 · Presentación

- "Downtempo es el sitio de un rooftop bar con música electrónica: cartelera, venta de entradas con QR, DJs, menú y panel de administración."
- Mostrar el árbol: `backend/src` (routes, controllers, services, repositories, models, middlewares, exceptions, responses) y `frontend/src` (pages, components, services, context).
- Decir que primero se ve el flujo en la interfaz y después el código, en el mismo orden.

## 0:30 – 2:30 · Recorrido en la interfaz

1. **Home → cartelera.** Señalar el cupo en vivo ("quedan N entradas").
2. Tocar **Comprar entradas** sin sesión: el modal pide cuenta. No se puede comprar anónimo.
3. **Ingresar → Crear cuenta.** Probar un email ya registrado (error 409 del backend) y una contraseña corta (error del front). Crear la cuenta: vuelve sola a la pantalla anterior y el menú muestra "Salir (nombre)".
4. **Salir e ingresar de nuevo** con la contraseña mal (error de credenciales) y después bien.
5. **Comprar:** 2 entradas + un trago en "pedido encargado". Confirmar y ver las entradas con **código y QR**.
6. **Mis entradas:** aparece la reserva; en la cartelera el cupo bajó en 2.
7. **Cancelar** (diálogo de confirmación) → toast de éxito y el cupo vuelve a subir.
8. *(Cierre)* Comprar de nuevo, copiar un código y validarlo en **Admin → Entradas y ventas → Control de puerta**. Validarlo otra vez: "ya fue usada".

## 2:30 – 5:45 · Back-End (en el orden del cliente)

### Ingresar (≈ 0:50)
| Archivo | Qué decir |
| --- | --- |
| `routes/authRoutes.js` | `POST /auth/registro` y `/auth/login` son públicas; `/logout` y `/yo` pasan por `requireAuth`. |
| `middlewares/validateAuth.js` | Valida formato: nombre, email válido, contraseña de 8 a 72 caracteres. |
| `services/AuthService.js` → `registrar` / `login` | Registro: email normalizado y único (409). Login: mismo mensaje si falla el email o la contraseña, para no revelar qué emails existen. Abre una sesión con token aleatorio de 32 bytes que dura 7 días. |
| `utils/password.js` | La contraseña se guarda con scrypt + salt, nunca en texto plano, y nunca se devuelve. |
| `middlewares/requireAuth.js` | Lee `Authorization: Bearer`, le pide el cliente a `AuthService.autenticar` y lo deja en `req.cliente`. |

### Comprar (≈ 1:15)
Seguir `POST /api/reservas` capa por capa:

| Capa | Archivo | Qué decir |
| --- | --- | --- |
| Rutas | `routes/reservaRoutes.js` | `router.use(requireAuth)`: toda la ruta exige sesión. |
| Middleware | `middlewares/validateReserva.js` | Valida formato: evento, cantidad entre 1 y 6, pedido. El comprador **no** viaja en el body, sale de la sesión. |
| Controller | `controllers/ReservaController.js` | Solo traduce HTTP ↔ servicio; no tiene reglas. |
| Service | `services/ReservaService.js` → `create` | Evento existe y no es pasado, hay cupo (409), ítems del pedido existen, genera códigos únicos `DT-XXXXXX`. |
| Repository | `ReservaRepository.js`, `EventoRepository.js` | Descuenta el cupo y guarda la reserva. |
| Modelo | `models/Reserva.js`, `Entrada.js` | Reserva compuesta por entradas, como en el diagrama de clases. |

### Ver sus entradas (≈ 0:40)
- `GET /api/reservas` → `ReservaController.getMias` → `ReservaService.getByCliente(req.cliente.idCliente)`.
- Punto clave: el filtro sale del **token**, no de un parámetro. Un cliente no puede pedir las reservas de otro.
- Mostrar `getById`: si la reserva es de otra cuenta, `#getPropia` responde **403**.

### Cancelar (≈ 0:50)
- `DELETE /api/reservas/:id` → `ReservaService.cancel`.
- Reglas: solo el dueño (403), no si ya estaba cancelada (409), no si el evento pasó (409), no si alguna entrada ya se usó (409).
- Si todo está bien: devuelve las entradas al cupo con `ajustarEntradas` y marca la reserva como cancelada.

### Errores (≈ 0:20)
- `exceptions/AppError.js` + `middlewares/errorHandler.js` y el formato `{ success, data | message }` de `responses/ApiResponse.js`. Mostrar un error real: `POST /api/reservas` sin token → 401.

## 5:45 – 8:00 · Front-End (mismo orden)

1. `services/api.js`: wrapper único de `fetch`; interpreta `{ success, data, message }` y lanza `ApiError` con el mensaje del servidor. **Todo pedido HTTP vive en `services/`**: los componentes nunca llaman a `fetch`.
2. **Ingresar:** `services/authService.js` (guarda el token y arma `authHeaders()`), `context/AuthContext.jsx` (sesión para toda la app; al abrir el sitio pregunta a `/auth/yo` si el token sirve) y `pages/LoginPage.jsx` (`handleSubmit`: valida con `utils/validators.js`, muestra los errores del backend y vuelve a la pantalla de origen).
3. **Comprar:** `components/events/CheckoutDialog.jsx`. Sin cliente ofrece ingresar; con cliente arma el pedido y llama a `createReserva`. Éxito → entradas con QR (`TicketCard`); error → toast.
4. **Ver y cancelar:** `pages/MisEntradasPage.jsx`. Sin sesión redirige al login; `cargar` trae las reservas con `getMisReservas`; `handleConfirmCancel` cancela tras el diálogo de confirmación y recarga. Si el backend contesta 401, cierra la sesión.

## 8:00 – 8:45 · Cierre

- Repasar: cuentas con contraseña, compra con validaciones en el backend, "Mis entradas" y cancelación, todo integrado front-back.
- Correr `npm test` en `backend/` (65 tests) y dejar el resultado en pantalla unos segundos.
- Mencionar que el pago es en la puerta y qué se podría sumar (cobro online, recuperar contraseña).

---

## Si te pasás de tiempo

Recortá en este orden: paso 8 de la interfaz (control de puerta), la tabla de modelo y repository en "Comprar", y el bloque de errores.

## Checklist antes de grabar

- [ ] `npm run seed` hecho (cartelera con fechas futuras, sin cuentas viejas).
- [ ] Backend en `:3000` y frontend en `:5173` corriendo.
- [ ] Sesión cerrada y `localStorage` limpio (para mostrar el registro desde cero).
- [ ] Archivos de las tablas abiertos en pestañas del editor, en orden.
- [ ] Zoom del navegador y del editor para que se lea en el video.
- [ ] Exportar en **.mp4**, entre 5 y 10 minutos.
