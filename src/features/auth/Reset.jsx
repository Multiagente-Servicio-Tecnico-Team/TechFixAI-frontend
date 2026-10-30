import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CircleCheck, LinkIcon, LoaderCircle, ShieldCheck } from "lucide-react";
import { BackLink } from "../../shared/ui/ui.jsx";
import PasswordFields from "./PasswordFields.jsx";
import { isStrongPassword } from "../../domain/validation.js";
import { authApi as defaultApi, MESSAGES } from "./authApi.js";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";

/**
 * Pantalla creada: destino del enlace que envía /recuperar.
 * Lee ?token= de la URL y envía POST /restablecer { token, password }.
 */
export default function Reset({ api = defaultApi }) {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  // Un enlace distinto reinicia el formulario y sus estados.
  return <ResetForm key={token} token={token} api={api} />;
}

function ResetForm({ token, api }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [tokenError, setTokenError] = useState(token ? "" : MESSAGES.invalidToken);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const next = {};
    if (!isStrongPassword(password)) next.password = "La contraseña no cumple todos los requisitos.";
    if (!confirm || confirm !== password) next.confirm = "Las contraseñas no coinciden.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await api.resetPassword({ token, password });
      setPassword("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      if (err?.code === "invalid_token") setTokenError(err.message);
      else setFormError(err?.message || MESSAGES.unexpected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__intro">
        <BackLink to="/portal/acceso">Volver a iniciar sesión</BackLink>
        <span className="stamp stamp--info"><ShieldCheck size={14} aria-hidden="true" />Seguridad de cuenta · Nueva contraseña</span>
        <h1 className="auth__title">{done ? "Contraseña actualizada" : tokenError ? "Enlace no válido" : "Crea una nueva contraseña"}</h1>
      </div>
      <div className="jobtag jobtag--lg">
          {done ? (
            <div className="result">
              <span className="result__seal"><CircleCheck size={26} aria-hidden="true" /></span>
              <p>Ya puedes ingresar a tu portal con la nueva contraseña. Por seguridad, el enlace dejó de ser válido.</p>
              <Link to="/portal/acceso" className="btn btn--primary">Iniciar sesión <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          ) : tokenError ? (
            <div className="result">
              <span className="result__seal result__seal--warn"><LinkIcon size={24} aria-hidden="true" /></span>
              <p>{tokenError} Los enlaces de restablecimiento duran 15 minutos y solo pueden usarse una vez.</p>
              <Link to="/portal/recuperar" className="btn btn--primary">Solicitar un nuevo enlace <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          ) : (
            <>
              <p>Elige una contraseña segura que no hayas usado antes en TechFix.AI.</p>
              <form className="form" onSubmit={submit} noValidate aria-busy={loading}>
                <FormAlert>{formError}</FormAlert>
                <PasswordFields
                  idPrefix="reset"
                  label="Nueva Contraseña"
                  password={password}
                  confirm={confirm}
                  onPassword={(e) => setPassword(e.target.value)}
                  onConfirm={(e) => setConfirm(e.target.value)}
                  errors={errors}
                />
                <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loading}>
                  {loading ? (
                    <><LoaderCircle size={18} className="spin" aria-hidden="true" /> Guardando…</>
                  ) : (
                    <>Guardar Nueva Contraseña <ArrowRight size={18} aria-hidden="true" /></>
                  )}
                </button>
              </form>
            </>
          )}
      </div>
    </div>
  );
}
