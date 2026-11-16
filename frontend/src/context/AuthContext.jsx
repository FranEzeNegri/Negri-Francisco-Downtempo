import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authService from "../services/authService.js";

const AuthContext = createContext(null);

// Sesión del cliente para toda la app. Si hay un token guardado, al abrir el
// sitio se le pregunta al backend de quién es (y si todavía sirve).
export function AuthProvider({ children }) {
  const [cliente, setCliente] = useState(null);
  const [cargando, setCargando] = useState(authService.hayToken);

  useEffect(() => {
    if (!authService.hayToken()) return;

    authService
      .getCliente()
      .then(setCliente)
      .catch((err) => {
        // Solo un 401 invalida el token; si el backend está caído se conserva.
        if (err.status === 401) authService.olvidarSesion();
      })
      .finally(() => setCargando(false));
  }, []);

  const iniciarSesion = useCallback(async (datos) => {
    setCliente(await authService.iniciarSesion(datos));
  }, []);

  const registrar = useCallback(async (datos) => {
    setCliente(await authService.registrar(datos));
  }, []);

  const cerrarSesion = useCallback(async () => {
    await authService.cerrarSesion();
    setCliente(null);
  }, []);

  // Para cuando el backend responde 401 en medio de una operación.
  const sesionVencida = useCallback(() => {
    authService.olvidarSesion();
    setCliente(null);
  }, []);

  const value = useMemo(
    () => ({ cliente, cargando, iniciarSesion, registrar, cerrarSesion, sesionVencida }),
    [cliente, cargando, iniciarSesion, registrar, cerrarSesion, sesionVencida]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }

  return context;
}
