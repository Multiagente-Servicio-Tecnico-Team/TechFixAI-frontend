import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="jobtag jobtag--lg lost">
        <span className="result__seal result__seal--warn"><Compass size={26} aria-hidden="true" /></span>
        <p className="kicker">Error 404</p>
        <h1 className="auth__title">Esta página no existe</h1>
        <p className="auth__lead">Puede que el enlace esté incompleto o que la página se haya movido.</p>
        <div className="btn-row">
          <Link to="/" className="btn btn--primary">Ir al inicio</Link>
          <Link to="/portal/acceso" className="btn">Portal de clientes</Link>
        </div>
    </div>
  );
}
