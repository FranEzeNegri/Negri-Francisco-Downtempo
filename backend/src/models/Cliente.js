class Cliente {
    // `contraseña` guarda el hash (ver utils/password.js), nunca el texto original.
    constructor(idCliente, nombre, email, contraseña, fechaRegistro) {
        this.idCliente = idCliente;
        this.nombre = nombre;
        this.email = email;
        this.contraseña = contraseña;
        this.fechaRegistro = fechaRegistro;
    }
}

export default Cliente;
