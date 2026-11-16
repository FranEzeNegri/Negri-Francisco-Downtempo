import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";
import SectionHeading from "../components/ui/SectionHeading.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { MIN_PASSWORD, validateAuthForm } from "../utils/validators.js";
import "./LoginPage.css";

// Ingreso y registro de clientes. Si el cliente llegó acá porque una pantalla
// le pidió sesión (comprar, "Mis entradas"), al terminar vuelve a esa pantalla.
function LoginPage() {
  const { cliente, iniciarSesion, registrar } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.from ?? "/mis-entradas";

  const [registro, setRegistro] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (cliente && !submitting) {
    return <Navigate to={destino} replace />;
  }

  const cambiarModo = (esRegistro) => {
    setRegistro(esRegistro);
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const found = validateAuthForm({ nombre, email, password }, registro);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);

    try {
      if (registro) {
        await registrar({ nombre: nombre.trim(), email: email.trim(), password });
        toast.success("Cuenta creada. ¡Bienvenido a Downtempo!");
      } else {
        await iniciarSesion({ email: email.trim(), password });
        toast.success("Sesión iniciada.");
      }

      navigate(destino, { replace: true });
    } catch (err) {
      // Los errores del backend (credenciales, email repetido…) van en el formulario.
      setErrors({ general: err.message });
      setSubmitting(false);
    }
  };

  return (
    <div className="page container login">
      <SectionHeading lead={registro ? "Crear" : "Iniciar"} highlight={registro ? "cuenta" : "sesión"} level={1} />
      <p className="page__intro">
        {registro
          ? "Con tu cuenta comprás entradas, ves tus códigos QR y cancelás reservas desde cualquier dispositivo."
          : "Ingresá con tu cuenta para comprar entradas y ver tus reservas."}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {registro && (
          <FormField
            id="auth-nombre"
            label="Nombre completo"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            error={errors.nombre}
            autoComplete="name"
            required
          />
        )}
        <FormField
          id="auth-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          autoComplete="email"
          required
        />
        <FormField
          id="auth-password"
          label="Contraseña"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          hint={registro ? `Mínimo ${MIN_PASSWORD} caracteres.` : undefined}
          autoComplete={registro ? "new-password" : "current-password"}
          required
        />

        {errors.general && (
          <p className="login__error" role="alert">
            {errors.general}
          </p>
        )}

        <Button type="submit" loading={submitting}>
          {registro ? "Crear cuenta" : "Ingresar"}
        </Button>
      </form>

      <p className="login__switch">
        {registro ? "¿Ya tenés cuenta?" : "¿Todavía no tenés cuenta?"}{" "}
        <button type="button" className="login__link" onClick={() => cambiarModo(!registro)}>
          {registro ? "Iniciá sesión" : "Creá una"}
        </button>
      </p>
    </div>
  );
}

export default LoginPage;
