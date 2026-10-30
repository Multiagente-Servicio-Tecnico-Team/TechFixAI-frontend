import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, BellRing, CircleCheck, Contact, LoaderCircle, Mail, Smartphone } from "lucide-react";
import { Field, InputIcon } from "../../shared/ui/ui.jsx";
import PasswordFields from "./PasswordFields.jsx";
import { EMAIL_RE, isMobilePhone, isStrongPassword } from "../../domain/validation.js";
import { fullName, splitFullName, toE164 } from "../../domain/user.js";
import { useStore } from "../../state/store.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { authApi as defaultApi, MESSAGES } from "./authApi.js";

// Campos del contrato POST /registro -> campos del formulario.
const API_FIELDS = { nombre: "name", email: "email", telefono: "phone", password: "password" };

/** Valida el formulario de registro; devuelve un objeto { campo: mensaje }. */
export function validateRegister(form) {
  const errors = {};
  if (form.name.trim().length < 3) errors.name = "Ingresa tu nombre y apellido.";
  if (!EMAIL_RE.test(form.email.trim())) errors.email = "Ingresa un correo electrónico válido.";
  if (!isMobilePhone(form.phone)) errors.phone = "Ingresa un número móvil de 9 dígitos.";
  if (!isStrongPassword(form.password)) errors.password = "La contraseña no cumple todos los requisitos.";
  if (!form.confirm || form.confirm !== form.password) errors.confirm = "Las contraseñas no coinciden.";
  if (!form.terms) errors.terms = "Debes aceptar los términos para continuar.";
  return errors;
}

export default function Register({ api = defaultApi }) {
  const { session, login } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", prefix: "+51", phone: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const emailOk = EMAIL_RE.test(form.email.trim());

  // Un cliente con sesión abierta no necesita registrarse de nuevo.
  if (session?.role === "client" && !loading) return <Navigate to="/portal/tickets" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const next = validateRegister(form);
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const { firstName, lastName } = splitFullName(form.name);
      const user = await api.register({
        firstName,
        lastName,
        email: form.email,
        phone: toE164(form.prefix, form.phone),
        password: form.password,
      });
      login({ role: "client", email: user.email, name: fullName(user) || form.name.trim() });
      navigate("/portal/tickets", { replace: true });
    } catch (err) {
      const field = API_FIELDS[err?.field];
      if (field) {
        setErrors({ [field]: err.message });
      } else {
        setFormError(err?.message || MESSAGES.unexpected);
      }
      setLoading(false);
    }
  };

  return (
    <div className="auth auth--wide">
      <div className="auth__intro">
        <h1 className="auth__title">Crear Cuenta de Cliente</h1>
        <p className="auth__lead">
          Únete a TechFix.AI para registrar tus dispositivos, solicitar triage inteligente y gestionar garantías en tiempo real.
        </p>
        <p className="auth__links">¿Ya tienes una cuenta registrada? <Link to="/portal/acceso" className="link">Inicia sesión aquí</Link></p>
      </div>
      <div className="jobtag jobtag--lg">
        <form className="form" onSubmit={submit} noValidate aria-busy={loading}>
          <FormAlert>{formError}</FormAlert>
          <div className="reg-grid">
          <div className="reg-grid__col">
          <Field label="Nombre y Apellido" htmlFor="name" error={errors.name}>
            <InputIcon icon={Contact}>
              <input id="name" className="input input--icon" placeholder="Martín Gómez" autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={!!errors.name || undefined} />
            </InputIcon>
          </Field>

          <Field label="Correo Electrónico" htmlFor="reg-email" error={errors.email}>
            <InputIcon icon={Mail} suffix={emailOk && !errors.email ? <CircleCheck size={18} className="ok" aria-label="Correo válido" /> : null}>
              <input id="reg-email" type="email" className="input input--icon" placeholder="tu.correo@ejemplo.com" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email || undefined} />
            </InputIcon>
          </Field>

          <Field
            label="Teléfono Móvil"
            htmlFor="phone"
            error={errors.phone}
            hint={<span className="hint-ok"><BellRing size={13} aria-hidden="true" /> Utilizado exclusivamente para avisos de retiro y actualizaciones de triage.</span>}
          >
            <div className="phone-row">
              <select className="input select phone-row__prefix" value={form.prefix} onChange={set("prefix")} aria-label="Código de país">
                <option value="+51">PE +51</option>
                <option value="+56">CL +56</option>
                <option value="+57">CO +57</option>
                <option value="+52">MX +52</option>
              </select>
              <InputIcon icon={Smartphone}>
                <input id="phone" type="tel" inputMode="tel" className="input input--icon" placeholder="987 654 321" autoComplete="tel-national" value={form.phone} onChange={set("phone")} aria-invalid={!!errors.phone || undefined} />
              </InputIcon>
            </div>
          </Field>

          </div>
          <div className="reg-grid__col">
          <PasswordFields
            password={form.password}
            confirm={form.confirm}
            onPassword={set("password")}
            onConfirm={set("confirm")}
            errors={errors}
          />
          </div>
          </div>

          <div className="field">
            <label className="check">
              <input type="checkbox" checked={form.terms} onChange={set("terms")} />
              <span>
                Acepto los <Link to="/ayuda#legal" className="link">Términos de Servicio</Link> y la{" "}
                <Link to="/ayuda#legal" className="link">Política de Privacidad de Datos</Link> de TechFix.AI.
              </span>
            </label>
            {errors.terms && <p className="field__error" role="alert">{errors.terms}</p>}
          </div>

          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loading}>
            {loading ? (
              <><LoaderCircle size={18} className="spin" aria-hidden="true" /> Creando cuenta…</>
            ) : (
              <>Crear Mi Cuenta <ArrowRight size={18} aria-hidden="true" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
