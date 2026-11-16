import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import SectionHeading from "../components/ui/SectionHeading.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import TicketCard from "../components/tickets/TicketCard.jsx";
import { cancelarReserva, getMisReservas } from "../services/reservaService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { fechaHora, fechaLarga, formatPrecio, hoyISO } from "../utils/format.js";
import "./MisEntradasPage.css";

// "Mis entradas": las reservas del cliente con sesión iniciada, con el QR de
// cada entrada y la opción de cancelar.
function MisEntradasPage() {
  const { cliente, cargando, sesionVencida } = useAuth();
  const toast = useToast();

  const [consulta, setConsulta] = useState({ reservas: null, loading: true, error: null });
  const [pendingCancel, setPendingCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const reservas = await getMisReservas();
      setConsulta({ reservas, loading: false, error: null });
    } catch (err) {
      if (err.status === 401) sesionVencida();
      setConsulta({ reservas: null, loading: false, error: err.message });
    }
  }, [sesionVencida]);

  const idCliente = cliente?.idCliente;

  useEffect(() => {
    if (idCliente) cargar();
  }, [idCliente, cargar]);

  const handleConfirmCancel = async () => {
    setCancelLoading(true);

    try {
      await cancelarReserva(pendingCancel.idReserva);
      toast.success("Reserva cancelada. Las entradas volvieron a estar disponibles.");
      await cargar();
    } catch (err) {
      if (err.status === 401) sesionVencida();
      toast.error(err.message);
    } finally {
      setCancelLoading(false);
      setPendingCancel(null);
    }
  };

  if (cargando) {
    return (
      <div className="page container">
        <Spinner label="Verificando tu sesión…" />
      </div>
    );
  }

  // Sin sesión se pasa por el login y se vuelve a esta pantalla.
  if (!cliente) {
    return <Navigate to="/ingresar" state={{ from: "/mis-entradas" }} replace />;
  }

  const { reservas, loading, error } = consulta;

  return (
    <div className="page container mis-entradas">
      <SectionHeading lead="Mis" highlight="entradas" level={1} />
      <p className="page__intro">
        Hola, {cliente.nombre}. Acá están tus reservas: mostrá el QR o el código en la puerta, o cancelá una reserva si
        no podés ir.
      </p>

      <div aria-live="polite">
        {loading && <Spinner label="Buscando tus entradas…" />}

        {error && (
          <p className="panel-state panel-state--error" role="alert">
            No pudimos buscar tus entradas: {error}
          </p>
        )}

        {reservas && reservas.length === 0 && (
          <div className="panel-state">
            <p>Todavía no compraste entradas.</p>
            <Link to="/#entradas" className="btn btn--secondary">
              Ver la cartelera
            </Link>
          </div>
        )}

        {reservas && reservas.length > 0 && (
          <>
            <p className="mis-entradas__count">
              {reservas.length} {reservas.length === 1 ? "reserva" : "reservas"}
            </p>
            <ul className="mis-entradas__list">
              {reservas.map((reserva) => (
                <ReservaCard key={reserva.idReserva} reserva={reserva} onCancelar={setPendingCancel} />
              ))}
            </ul>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        title="Cancelar reserva"
        description={
          pendingCancel
            ? `¿Seguro que querés cancelar tus ${pendingCancel.cantidadEntradas} entradas para ${pendingCancel.evento.nombre}? Los códigos dejan de ser válidos.`
            : ""
        }
        confirmLabel="Sí, cancelar"
        cancelLabel="Volver"
        loading={cancelLoading}
        onConfirm={handleConfirmCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  );
}

function ReservaCard({ reserva, onCancelar }) {
  const cancelada = reserva.estado === "cancelada";
  const pasada = reserva.evento.fecha < hoyISO();
  const algunaUsada = reserva.entradas.some((entrada) => entrada.usada);
  const cancelable = !cancelada && !pasada && !algunaUsada;

  return (
    <li className={`reserva${cancelada ? " reserva--cancelada" : ""}`}>
      <header className="reserva__header">
        <div>
          <h2 className="reserva__title">
            <Link to={`/eventos/${reserva.evento.idEvento}`}>{reserva.evento.nombre}</Link>
          </h2>
          <p className="reserva__when">
            {fechaLarga(reserva.evento.fecha)} · {reserva.evento.horaInicio} a {reserva.evento.horaFin} hs
          </p>
        </div>
        <span className="reserva__status">{cancelada ? "Cancelada" : pasada ? "Finalizada" : "Confirmada"}</span>
      </header>

      <ul className="ticket-list" aria-label={`Entradas para ${reserva.evento.nombre}`}>
        {reserva.entradas.map((entrada, index) => (
          <TicketCard key={entrada.idEntrada} entrada={entrada} numero={index + 1} cancelada={cancelada} />
        ))}
      </ul>

      {reserva.pedido.length > 0 && (
        <div className="reserva__pedido">
          <h3>Pedido encargado</h3>
          <ul>
            {reserva.pedido.map((linea) => (
              <li key={linea.idItem}>
                <span>
                  {linea.cantidad} × {linea.nombre}
                </span>
                <span>{formatPrecio(linea.precio * linea.cantidad)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="reserva__footer">
        <p>
          Reserva #{reserva.idReserva} · {fechaHora(reserva.fechaReserva)} · Total{" "}
          <strong>{formatPrecio(reserva.total)}</strong>
        </p>
        {cancelable && (
          <Button variant="danger" onClick={() => onCancelar(reserva)}>
            Cancelar reserva
          </Button>
        )}
      </footer>
    </li>
  );
}

export default MisEntradasPage;
