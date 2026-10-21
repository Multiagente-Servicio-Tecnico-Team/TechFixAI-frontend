import { Check, CircleCheck, KeyRound, X } from "lucide-react";
import { Field, PasswordInput } from "../../shared/ui/ui.jsx";
import { PASSWORD_RULES } from "../../domain/validation.js";

const strengthLabel = ["Muy débil", "Débil", "Media", "Buena", "Fuerte"];

/** Contraseña nueva + confirmación con requisitos en vivo (registro y restablecimiento). */
export default function PasswordFields({ password, confirm, onPassword, onConfirm, errors = {}, label = "Contraseña", idPrefix = "reg" }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const matches = confirm.length > 0 && confirm === password;

  return (
    <>
      <Field
        label={label}
        htmlFor={`${idPrefix}-pass`}
        error={errors.password}
        aside={password && <span className={`strength strength--${passed}`}>Seguridad: {strengthLabel[passed]}</span>}
      >
        <PasswordInput id={`${idPrefix}-pass`} icon={KeyRound} autoComplete="new-password" value={password} onChange={onPassword} invalid={!!errors.password} />
        <div className="meter" aria-hidden="true">
          <span style={{ width: `${(passed / PASSWORD_RULES.length) * 100}%` }} className={`meter__bar meter__bar--${passed}`} />
        </div>
        <ul className="rules" aria-label="Requisitos de la contraseña">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.id} className={ok ? "is-ok" : ""}>
                {ok ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}
                {r.label}
              </li>
            );
          })}
        </ul>
      </Field>

      <Field
        label="Confirmar Contraseña"
        htmlFor={`${idPrefix}-confirm`}
        error={errors.confirm}
        aside={matches && <span className="match"><CircleCheck size={14} aria-hidden="true" /> Coinciden</span>}
      >
        <PasswordInput id={`${idPrefix}-confirm`} icon={KeyRound} autoComplete="new-password" value={confirm} onChange={onConfirm} invalid={!!errors.confirm} />
      </Field>
    </>
  );
}
