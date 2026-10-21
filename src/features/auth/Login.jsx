import { Link } from "react-router-dom";
import { LoginForm } from "./LoginForm.jsx";

export default function Login() {
  return (
    <LoginForm
      role="client"
      badge="Portal de clientes"
      title="Acceder a mi Portal de Servicio"
      subtitle="Gestiona tus tickets de reparación, aprueba presupuestos y chatea con nuestro agente IA en tiempo real."
      defaultTo="/portal/tickets"
      footer={
        <>
          <p>¿Aún no tienes cuenta? <Link to="/portal/registro" className="link">Regístrate gratis aquí</Link></p>
          <p>¿Eres parte del taller? <Link to="/taller/acceso" className="link">Acceso para personal</Link></p>
        </>
      }
    />
  );
}
