import authService from "../services/AuthService.js";

// Protege las rutas que necesitan un cliente con sesión iniciada. El token
// viaja en el header "Authorization: Bearer <token>". Si es válido, deja el
// cliente en req.cliente para que lo usen los controladores.
export const requireAuth = (req, res, next) => {
    const [tipo, token] = (req.get("authorization") ?? "").split(" ");

    req.cliente = authService.autenticar(tipo === "Bearer" ? token : undefined);
    req.token = token;

    next();
};
