import { Link } from "react-router-dom";

export default function TicketAccessDenied() {
  return (
    <div className="page">
      <div className="jobtag jobtag--lg" role="alert">
        <h1 className="title">Acceso restringido</h1>
        <p>Solo administradores pueden gestionar tickets.</p>
        <Link className="btn btn--primary" to="/taller/inventario">Volver al taller</Link>
      </div>
    </div>
  );
}
