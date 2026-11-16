// Sesión abierta de un cliente: el token viaja en cada petición autenticada.
class Sesion {
    constructor(token, idCliente, expira) {
        this.token = token;
        this.idCliente = idCliente;
        this.expira = expira;
    }
}

export default Sesion;
