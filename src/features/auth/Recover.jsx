import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, AtSign, Info, LoaderCircle, MailCheck, ShieldCheck } from "lucide-react";
import { BackLink, Field, InputIcon } from "../../shared/ui/ui.jsx";
import { EMAIL_RE } from "../../domain/validation.js";
import { authApi as defaultApi, MESSAGES } from "./authApi.js";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";

export default function Recover({ api = defaultApi }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setFormError("");
    if (!EMAIL_RE.test(email.trim())) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.requestPasswordReset({ email });
      setSent(true);
    } catch (err) {
      setFormError(err?.message || MESSAGES.unexpected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__intro">
        <BackLink to="/portal/acceso">Volver a iniciar sesión</BackLink>
        <span className="stamp stamp--info"><ShieldCheck size={14} aria-hidden="true" />Seguridad de cuenta · Soporte técnico</span>
        <h1 className="auth__title">{sent ? "Revisa tu correo" : "¿Olvidaste tu contraseña?"}</h1>
      </div>
      <div className="jobtag jobtag--lg">
          {sent ? (
            <div className="result">
              <span className="result__seal"><MailCheck size={26} aria-hidden="true" /></span>
              <p>
                Si <strong>{email.trim()}</strong> está registrado, recibirás un enlace de restablecimiento válido durante 15 minutos.
                Revisa también tu carpeta de spam.
              </p>
              <div className="btn-row">
                <button type="button" className="btn" onClick={() => setSent(false)}>Usar otro correo</button>
                {api.mode === "mock" && (
                  <Link to="/portal/restablecer?token=demo" className="btn">Abrir enlace de prueba</Link>
                )}
              </div>
              {api.mode === "mock" && (
                <p className="demo-note"><Info size={14} aria-hidden="true" /> Modo demostración: no se envían correos; usa el enlace de prueba.</p>
              )}
            </div>
          ) : (
            <>
              <p>
                Introduce el correo electrónico asociado a tu cuenta de TechFix.AI para recibir un enlace seguro de
                restablecimiento de contraseña temporal (válido durante 15 minutos).
              </p>
              <form className="form" onSubmit={submit} noValidate aria-busy={loading}>
                <FormAlert>{formError}</FormAlert>
                <Field
                  label="Correo Electrónico Registrado"
                  htmlFor="recover-email"
                  error={error}
                  hint={<><Info size={13} aria-hidden="true" /> Enviaremos una llave criptográfica temporal a esta dirección.</>}
                >
                  <InputIcon icon={AtSign}>
                    <input
                      id="recover-email"
                      type="email"
                      className="input input--icon"
                      placeholder="ejemplo@tudominio.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={!!error || undefined}
                    />
                  </InputIcon>
                </Field>
                <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loading}>
                  {loading ? (
                    <><LoaderCircle size={18} className="spin" aria-hidden="true" /> Enviando…</>
                  ) : (
                    <>Enviar Enlace de Restablecimiento <ArrowRight size={18} aria-hidden="true" /></>
                  )}
                </button>
              </form>
            </>
          )}
          <Link to="/portal/acceso" className="link">← Volver a Iniciar Sesión</Link>
      </div>
    </div>
  );
}
