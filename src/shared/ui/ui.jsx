import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Battery, Check, ChevronLeft, ChevronRight, CircleCheck, Cpu, Eye, EyeOff, Laptop, MemoryStick, Monitor } from "lucide-react";

export function Field({ label, htmlFor, required, hint, error, aside, children, className = "" }) {
  return (
    <div className={`field ${className}`}>
      {(label || aside) && (
        <div className="field__top">
          {label && (
            <label htmlFor={htmlFor} className="field__label">
              {label}
              {required && <span className="field__req"> *<span className="vh"> (obligatorio)</span></span>}
            </label>
          )}
          {aside}
        </div>
      )}
      {children}
      {error ? (
        <p className="field__error" role="alert">{error}</p>
      ) : (
        hint && <p className="field__hint">{hint}</p>
      )}
    </div>
  );
}

export function InputIcon({ icon: Icon, suffix, children }) {
  return (
    <div className={`input-wrap${suffix ? " input-wrap--suffix" : ""}`}>
      {Icon && <Icon size={18} className="input-wrap__icon" aria-hidden="true" />}
      {children}
      {suffix && <span className="input-wrap__suffix">{suffix}</span>}
    </div>
  );
}

export function PasswordInput({ id, value, onChange, icon, autoComplete = "current-password", placeholder, invalid }) {
  const [show, setShow] = useState(false);
  return (
    <InputIcon icon={icon}>
      <input
        id={id}
        className="input input--icon input--action"
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        className="input-wrap__action"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </InputIcon>
  );
}

export function BackLink({ to, children }) {
  return (
    <Link to={to} className="back-link">
      <ArrowLeft size={16} aria-hidden="true" /> {children}
    </Link>
  );
}

const itemIcons = { laptop: Laptop, monitor: Monitor, chip: Cpu, battery: Battery, ram: MemoryStick, done: CircleCheck };

export function ItemIcon({ name, size = 20 }) {
  const Icon = itemIcons[name] || Cpu;
  return <Icon size={size} aria-hidden="true" />;
}

/**
 * Páginas visibles: primera, última y las vecinas de la actual; "gap" marca los saltos.
 * Con muchas páginas (p. ej. 110) no se dibuja un botón por página.
 */
export function pageWindow(page, pages, radius = 1) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const visible = new Set([1, pages]);
  for (let n = page - radius; n <= page + radius; n += 1) if (n >= 1 && n <= pages) visible.add(n);
  const sorted = [...visible].sort((a, b) => a - b);
  const items = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] === 2) items.push(n - 1);
    else if (i > 0 && n - sorted[i - 1] > 2) items.push(`gap-${n}`);
    items.push(n);
  });
  return items;
}

export function Pagination({ page, pages, onChange, label }) {
  if (pages <= 1) return label ? <p className="pager__label">{label}</p> : null;
  return (
    <div className="pager">
      {label && <p className="pager__label">{label}</p>}
      <nav className="pager__nav" aria-label="Paginación">
        <button type="button" className="pager__btn" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
          <ChevronLeft size={16} />
        </button>
        {pageWindow(page, pages).map((n) => (typeof n === "string" ? (
          <span key={n} className="pager__gap" aria-hidden="true">…</span>
        ) : (
          <button
            key={n}
            type="button"
            className={`pager__btn${n === page ? " is-active" : ""}`}
            aria-current={n === page ? "page" : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        )))}
        <button type="button" className="pager__btn" disabled={page === pages} onClick={() => onChange(page + 1)} aria-label="Página siguiente">
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}

/** Aviso breve que desaparece solo. */
export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <Check size={16} aria-hidden="true" /> {message}
    </div>
  );
}
