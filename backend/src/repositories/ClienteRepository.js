import Cliente from "../models/Cliente.js";
import store from "../db/store.js";

class ClienteRepository {
    findAll() {
        return store.get("clientes");
    }

    findById(id) {
        return this.findAll().find((cliente) => cliente.idCliente === id);
    }

    findByEmail(email) {
        return this.findAll().find((cliente) => cliente.email === email);
    }

    create({ nombre, email, contraseña }) {
        const cliente = new Cliente(store.nextId("clientes"), nombre, email, contraseña, new Date().toISOString());
        this.findAll().push(cliente);
        store.save();
        return cliente;
    }
}

export default new ClienteRepository();
