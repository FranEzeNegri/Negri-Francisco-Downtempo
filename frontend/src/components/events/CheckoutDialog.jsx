import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../ui/Button.jsx";
import Modal from "../ui/Modal.jsx";
import Stepper from "../ui/Stepper.jsx";
import TicketCard from "../tickets/TicketCard.jsx";
import { createReserva } from "../../services/reservaService.js";
import { getMenu } from "../../services/menuService.js";
import { useAsync } from "../../utils/useAsync.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fechaLarga, formatPrecio } from "../../utils/format.js";
import { MAX_ENTRADAS_POR_COMPRA, MAX_UNIDADES_POR_ITEM } from "../../utils/validators.js";
import "./CheckoutDialog.css";

// Compra en dos pasos dentro de un modal: elegir cantidad y pedido → entradas
// con código y QR. Hace falta tener sesión iniciada: la reserva queda a nombre
// de la cuenta. El pago se hace en la puerta. Opcionalmente se puede dejar
// encargado un pedido del menú.
function CheckoutDialog({ evento, onClose, onPurchased }) {
  const { cliente, sesionVencida } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const { data: menu } = useAsync(getMenu, []);

  const [cantidad, setCantidad] = useState(1);
  const [pedido, setPedido] = useState({}); // { [idItem]: cantidad }
  const [submitting, setSubmitting] = useState(false);
  const [reserva, setReserva] = useState(null);

  const maxEntradas = Math.min(MAX_ENTRADAS_POR_COMPRA, evento.entradasDisponibles);
  const lineas = (menu ?? []).filter((item) => pedido[item.idItem] > 0);
  const unidadesPedido = lineas.reduce((suma, item) => suma + pedido[item.idItem], 0);
  const totalPedido = lineas.reduce((suma, item) => suma + item.precio * pedido[item.idItem], 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const result = await createReserva({
        idEvento: evento.idEvento,
        cantidadEntradas: cantidad,
        pedido: lineas.map((item) => ({ idItem: item.idItem, cantidad: pedido[item.idItem] })),
      });
      setReserva(result);
      onPurchased();
    } catch (err) {
      if (err.status === 401) sesionVencida();
      toast.error(err.message);
      // Si se agotó el cupo mientras compraba, refrescamos la cartelera.
      onPurchased();
    } finally {
      setSubmitting(false);
    }
  };

  if (!cliente) {
    return (
      <Modal onClose={onClose} labelledBy="checkout-title" className="checkout">
        <p className="eyebrow">Comprar entradas</p>
        <h3 id="checkout-title" className="checkout__title">
          {evento.nombre}
        </h3>
        <p className="checkout__note">Para comprar entradas necesitás una cuenta. Así podés ver tus QR y cancelar cuando quieras.</p>
        <div className="checkout__actions">
          <Link
            to="/ingresar"
            state={{ from: location.pathname }}
            className="btn btn--primary"
            onClick={onClose}
            data-autofocus
          >
            Ingresar o crear cuenta
          </Link>
          <Button variant="secondary" onClick={onClose}>
            Ahora no
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} labelledBy="checkout-title" className="checkout">
      {reserva ? (
        <Confirmacion reserva={reserva} onClose={onClose} />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <p className="eyebrow">Comprar entradas</p>
          <h3 id="checkout-title" className="checkout__title">
            {evento.nombre}
          </h3>
          <p className="checkout__when">
            {fechaLarga(evento.fecha)} · {evento.horaInicio} a {evento.horaFin} hs
          </p>

          <div className="checkout__qty">
            <span>Cantidad</span>
            <Stepper
              value={cantidad}
              min={1}
              max={maxEntradas}
              onChange={setCantidad}
              label="entradas"
            />
            <span className="checkout__stock">{evento.entradasDisponibles} disponibles</span>
          </div>

          <p className="checkout__buyer">
            Comprás como <strong>{cliente.nombre}</strong> ({cliente.email})
          </p>

          {menu && menu.length > 0 && (
            <details className="checkout__preorder">
              <summary>
                Dejá tu pedido encargado <span>(opcional)</span>
                {unidadesPedido > 0 && <strong>{unidadesPedido}</strong>}
              </summary>
              <p className="checkout__note">Lo retirás en la barra la noche del evento, sin hacer fila.</p>
              <ul className="checkout__menu">
                {menu.map((item) => (
                  <li key={item.idItem}>
                    <div>
                      <span className="checkout__menu-name">{item.nombre}</span>
                      <span className="checkout__menu-meta">
                        {item.categoria} · {formatPrecio(item.precio)}
                      </span>
                    </div>
                    <Stepper
                      value={pedido[item.idItem] ?? 0}
                      max={MAX_UNIDADES_POR_ITEM}
                      onChange={(value) => setPedido((prev) => ({ ...prev, [item.idItem]: value }))}
                      label={item.nombre}
                    />
                  </li>
                ))}
              </ul>
            </details>
          )}

          <dl className="checkout__summary">
            <div>
              <dt>
                {cantidad} {cantidad === 1 ? "entrada" : "entradas"}
              </dt>
              <dd>{formatPrecio(evento.precio * cantidad)}</dd>
            </div>
            {unidadesPedido > 0 && (
              <div>
                <dt>Pedido ({unidadesPedido})</dt>
                <dd>{formatPrecio(totalPedido)}</dd>
              </div>
            )}
            <div className="checkout__total">
              <dt>Total</dt>
              <dd aria-live="polite">{formatPrecio(evento.precio * cantidad + totalPedido)}</dd>
            </div>
          </dl>

          <Button type="submit" loading={submitting}>
            Confirmar compra
          </Button>
          <p className="checkout__note">El pago se realiza en la puerta del local.</p>
        </form>
      )}
    </Modal>
  );
}

function Confirmacion({ reserva, onClose }) {
  const titleRef = useRef(null);

  // El formulario desaparece al confirmar: llevamos el foco al título para
  // que no se pierda y los lectores de pantalla anuncien el resultado.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div>
      <p className="eyebrow">¡Listo!</p>
      <h3 id="checkout-title" className="checkout__title" ref={titleRef} tabIndex={-1}>
        Tus entradas para {reserva.evento.nombre}
      </h3>
      <p className="checkout__when">
        {fechaLarga(reserva.evento.fecha)} · {reserva.evento.horaInicio} hs · {reserva.nombreCliente}
      </p>

      <ul className="ticket-list" aria-label="Entradas compradas">
        {reserva.entradas.map((entrada, index) => (
          <TicketCard key={entrada.idEntrada} entrada={entrada} numero={index + 1} />
        ))}
      </ul>

      <dl className="checkout__summary">
        {reserva.pedido.map((linea) => (
          <div key={linea.idItem}>
            <dt>
              {linea.cantidad} × {linea.nombre}
            </dt>
            <dd>{formatPrecio(linea.precio * linea.cantidad)}</dd>
          </div>
        ))}
        <div className="checkout__total">
          <dt>Total a pagar en la puerta</dt>
          <dd>{formatPrecio(reserva.total)}</dd>
        </div>
      </dl>
      <p className="checkout__note">
        Mostrá el QR o el código en la puerta. Los vas a encontrar siempre en “Mis entradas”.
      </p>

      <div className="checkout__actions">
        <Button onClick={onClose}>Listo</Button>
        <Link to="/mis-entradas" className="btn btn--secondary" onClick={onClose}>
          Ver mis entradas
        </Link>
      </div>
    </div>
  );
}

export default CheckoutDialog;
