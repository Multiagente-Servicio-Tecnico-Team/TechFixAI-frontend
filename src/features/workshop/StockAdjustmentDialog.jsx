import { useEffect, useId, useRef, useState } from "react";
import { Field } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { createIdempotencyKey } from "./inventoryApi.js";

const COUNT = /^\d{1,6}$/;

export default function StockAdjustmentDialog({ part, onClose, onSubmit, busy = false, error = "" }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const countRef = useRef(null);
  const returnFocus = useRef(null);
  const [count, setCount] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [attempt, setAttempt] = useState(null);

  useEffect(() => {
    if (!part) return undefined;
    returnFocus.current = document.activeElement;
    setCount(String(part.stock));
    setReason("");
    setErrors({});
    setAttempt(null);
    countRef.current?.focus();
    return () => {
      (returnFocus.current?.isConnected ? returnFocus.current : document.querySelector("main"))?.focus?.();
    };
  }, [part]);

  if (!part) return null;

  const close = () => { if (!busy) onClose(); };
  const trapFocus = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled])')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    const trimmedReason = reason.trim();
    if (!COUNT.test(count) || Number(count) > 999999) nextErrors.count = "Ingresa un conteo entero entre 0 y 999999.";
    if (!trimmedReason) nextErrors.reason = "Indica el motivo del ajuste.";
    else if (trimmedReason.length > 500) nextErrors.reason = "El motivo debe tener como máximo 500 caracteres.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = { counted_stock: Number(count), reason: trimmedReason };
    const sameAttempt = attempt?.payload.counted_stock === payload.counted_stock && attempt?.payload.reason === payload.reason;
    const idempotencyKey = sameAttempt ? attempt.key : createIdempotencyKey();
    setAttempt({ payload, key: idempotencyKey });
    await onSubmit(payload, idempotencyKey);
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section ref={dialogRef} className="dialog stock-adjustment-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={trapFocus}>
        <h2 id={titleId} className="dialog__title">Ajustar stock · {part.sku}</h2>
        <p>Registra el conteo físico de <strong>{part.name}</strong>. El saldo actual confirmado es {part.stock} unidades.</p>
        <form onSubmit={submit} noValidate>
          <Field label="Conteo físico" htmlFor="stock-adjustment-count" required error={errors.count}>
            <input ref={countRef} id="stock-adjustment-count" className="input" inputMode="numeric" type="text" pattern="[0-9]*" value={count} onChange={(event) => { setCount(event.target.value); setErrors((prev) => ({ ...prev, count: undefined })); }} aria-invalid={Boolean(errors.count)} disabled={busy} />
          </Field>
          <Field label="Motivo del ajuste" htmlFor="stock-adjustment-reason" required error={errors.reason}>
            <textarea id="stock-adjustment-reason" className="input" rows={3} maxLength={500} value={reason} onChange={(event) => { setReason(event.target.value); setErrors((prev) => ({ ...prev, reason: undefined })); }} aria-invalid={Boolean(errors.reason)} disabled={busy} />
          </Field>
          <FormAlert>{error}</FormAlert>
          <div className="dialog__actions">
            <button type="button" className="btn" onClick={close} disabled={busy}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Registrando…" : "Confirmar conteo"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
