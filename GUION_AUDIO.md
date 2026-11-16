# Guion para grabar el audio

Es el texto para leer en voz alta. `GUION_VIDEO.md` es la guía técnica (qué archivos abrir); este es lo que **decís**.

**Cómo leerlo**
- El texto normal se lee tal cual (podés cambiar palabras, pero mantené las ideas).
- **⏸ PAUSA Ns**: quedate callado N segundos. Hay pausa solo cuando en pantalla pasa algo que hace falta mirar.
- *[En pantalla: …]*: lo que se ve en ese momento. No se lee.
- Ritmo: tranquilo, unas 130 palabras por minuto. Duración estimada: **8 minutos y medio**.
- Grabá cada bloque por separado (un archivo de audio por bloque, `01-presentacion`, `02-interfaz`…). Así es más fácil de editar y de acomodar con el video.

---

## 01 · Presentación (≈ 0:30)

*[En pantalla: la home del sitio]*

Hola, soy Francisco Negri y este es mi proyecto: Downtempo, el sitio de un rooftop bar con música electrónica. Tiene cartelera de fechas, venta de entradas con código QR, DJs, menú y un panel de administración.

Para la demostración elegí el flujo que hace un cliente con sus entradas: crear su cuenta, ingresar, comprar entradas, verlas y cancelarlas.

*[En pantalla: el editor con las carpetas `backend/src` y `frontend/src`]*

El proyecto tiene un backend en Node con Express y un frontend en React. El backend sigue el patrón MVC: rutas, controladores, servicios, repositorios y modelos, además de middlewares, excepciones y respuestas.

Primero lo muestro funcionando y después explico el código, en el mismo orden.

## 02 · Recorrido en la interfaz (≈ 2:00)

*[En pantalla: la cartelera]*

Esta es la cartelera. Cada fecha muestra cuántas entradas quedan, y ese dato viene del backend en tiempo real.

Voy a tocar comprar entradas sin haber iniciado sesión.

⏸ PAUSA 3s *(se abre el modal que pide cuenta)*

Como ven, no se puede comprar de forma anónima: el sistema pide una cuenta. Voy a crear una.

*[En pantalla: pantalla de ingresar → crear cuenta]*

Primero pruebo una contraseña corta.

⏸ PAUSA 3s *(sale el error)*

Ese error lo detecta el frontend. Ahora uso un email que ya está registrado.

⏸ PAUSA 3s *(sale el error del backend)*

Este otro error ya lo devuelve el backend: no pueden existir dos cuentas con el mismo email. Ahora sí, con datos válidos.

⏸ PAUSA 4s *(se crea la cuenta, vuelve sola y el menú dice "Salir")*

La cuenta se creó, volvió sola a la pantalla anterior y arriba aparece mi nombre con la opción de salir.

Voy a cerrar la sesión y a probar el ingreso con una contraseña incorrecta.

⏸ PAUSA 3s

El mensaje es el mismo si falla el email o la contraseña, a propósito, para no revelar qué emails tienen cuenta. Ahora ingreso bien.

⏸ PAUSA 2s

Voy a comprar dos entradas, y además dejo encargado un trago para retirar en la barra.

*[En pantalla: modal de compra, sumar entradas, abrir "pedido encargado", sumar un trago, confirmar]*

⏸ PAUSA 5s *(aparecen las entradas con QR)*

Listo: cada entrada tiene su propio código y su QR. El pago se hace en la puerta del local.

*[En pantalla: Mis entradas]*

En "Mis entradas" está la reserva. Y si vuelvo a la cartelera, el cupo bajó en dos.

⏸ PAUSA 3s

Ahora cancelo la reserva.

⏸ PAUSA 3s *(diálogo de confirmación → mensaje de éxito)*

Se canceló y el cupo volvió a subir.

Por último, compro de nuevo y uso el código en el panel de administración, que es lo que haría el personal en la puerta.

*[En pantalla: admin → Entradas y ventas → pegar el código → validar]*

⏸ PAUSA 4s *(entrada válida)*

La entrada es válida. Si la valido otra vez…

⏸ PAUSA 2s *(error: ya fue usada)*

…el sistema avisa que ya fue usada. Cada entrada sirve una sola vez.

## 03 · Backend (≈ 3:15)

### Ingresar

*[En pantalla: `routes/authRoutes.js`]*

Ahora el código, empezando por el backend. Para ingresar, la ruta de registro y la de login son públicas. El resto de las rutas de cuenta pasan por un middleware que exige sesión.

*[En pantalla: `middlewares/validateAuth.js`]*

Antes de llegar a la lógica, un middleware valida el formato: que haya nombre, que el email sea válido y que la contraseña tenga entre 8 y 72 caracteres.

*[En pantalla: `services/AuthService.js`, método `registrar`]*

La lógica está en el servicio. Al registrar, normaliza el email y verifica que no exista: si existe, devuelve un conflicto, el error 409 que vimos recién.

*[En pantalla: `utils/password.js`]*

La contraseña nunca se guarda en texto plano: se guarda con un hash scrypt y una sal aleatoria, y nunca se devuelve en las respuestas.

*[En pantalla: `AuthService.js`, método `login` y luego `middlewares/requireAuth.js`]*

Al ingresar, el servicio abre una sesión con un token aleatorio que dura siete días. Ese token viaja en el header Authorization, y el middleware `requireAuth` lo busca, identifica al cliente y lo deja disponible para el resto de la petición.

### Comprar

*[En pantalla: `routes/reservaRoutes.js`]*

Ahora la compra. Esta es la ruta de reservas, y con una sola línea, `router.use(requireAuth)`, toda exige tener sesión.

*[En pantalla: `middlewares/validateReserva.js`]*

El middleware de validación controla el formato: el evento, una cantidad de uno a seis entradas y el pedido. Fíjense que el comprador no viaja en el cuerpo de la petición: sale de la sesión, así que nadie puede comprar a nombre de otro.

*[En pantalla: `controllers/ReservaController.js`]*

El controlador solo traduce entre HTTP y el servicio. No tiene reglas de negocio.

*[En pantalla: `services/ReservaService.js`, método `create`]*

Las reglas están acá, en el servicio. Verifica que el cliente y el evento existan, que el evento no haya pasado y que haya cupo suficiente; si no alcanza, responde con un conflicto. Después valida que los ítems del pedido estén en el menú y genera un código único por cada entrada.

*[En pantalla: `repositories/EventoRepository.js`, método `ajustarEntradas`]*

Recién cuando todo está bien, el repositorio descuenta el cupo y guarda la reserva. Así, si algo falla antes, nunca queda el cupo descontado a medias.

### Ver y cancelar

*[En pantalla: `ReservaService.js`, método `getByCliente`]*

Para ver las entradas, el servicio filtra las reservas por el identificador del cliente que sale del token, no por un parámetro. Un cliente no puede pedir las reservas de otro.

*[En pantalla: `ReservaService.js`, método `#getPropia`]*

Y si intenta abrir o cancelar una reserva ajena, este método responde error 403.

*[En pantalla: `ReservaService.js`, método `cancel`]*

La cancelación tiene sus propias reglas: no se puede cancelar dos veces, ni un evento que ya pasó, ni una reserva con entradas ya usadas. Si todo está bien, devuelve las entradas al cupo y marca la reserva como cancelada.

### Errores

*[En pantalla: `exceptions/AppError.js` y `middlewares/errorHandler.js`]*

Todos estos errores son excepciones propias. Un único middleware las captura y arma la respuesta con el mismo formato: success, y data o message.

*[En pantalla: Postman o el navegador: `POST /api/reservas` sin token]*

⏸ PAUSA 3s *(se ve el 401)*

Por ejemplo, si pido una reserva sin token, recibo un 401 con un mensaje claro.

## 04 · Frontend (≈ 2:00)

*[En pantalla: `services/api.js`]*

Ahora el frontend. Toda la comunicación con la API está centralizada en la carpeta services. Este archivo es un envoltorio único de fetch: interpreta la respuesta del backend y, si hay un error, lanza una excepción con el mensaje del servidor. Los componentes nunca llaman a fetch directamente.

*[En pantalla: `services/authService.js`]*

Para ingresar, este servicio guarda el token y arma el header de autorización que usan los demás servicios.

*[En pantalla: `context/AuthContext.jsx`]*

El contexto de autenticación mantiene la sesión para toda la aplicación. Al abrir el sitio, le pregunta al backend si el token guardado sigue siendo válido.

*[En pantalla: `pages/LoginPage.jsx`, función `handleSubmit`]*

En la pantalla de ingreso, `handleSubmit` valida el formulario, llama al servicio, muestra los errores que devuelve el backend y, si sale bien, vuelve a la pantalla de origen.

*[En pantalla: `components/events/CheckoutDialog.jsx`]*

En la compra, si no hay cliente, el modal ofrece ingresar. Si hay, arma el pedido y llama a `createReserva`. Si sale bien, muestra las entradas con su QR; si falla, muestra el mensaje del backend en una notificación.

*[En pantalla: `pages/MisEntradasPage.jsx`]*

Y en "Mis entradas": si no hay sesión, redirige al ingreso. La función `cargar` trae las reservas, y `handleConfirmCancel` cancela después del diálogo de confirmación y recarga la lista. Si el backend responde 401, la sesión se cierra sola.

## 05 · Cierre (≈ 0:45)

*[En pantalla: la terminal en `backend/`]*

Para terminar, corro los tests del backend.

⏸ PAUSA 5s *(se ejecutan: 65 tests)*

Son sesenta y cinco tests, entre servicios y pruebas de la API de punta a punta, y todos pasan.

*[En pantalla: la home]*

En resumen: el cliente crea su cuenta con contraseña, compra con validaciones hechas en el backend, ve sus entradas con el QR y las puede cancelar, y todo está integrado entre el frontend y el backend, respetando la separación en capas.

Como mejoras a futuro, se podrían agregar el cobro online y la recuperación de contraseña. Muchas gracias.
