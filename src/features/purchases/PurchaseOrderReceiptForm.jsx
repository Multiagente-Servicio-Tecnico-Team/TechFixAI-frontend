import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Field } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { purchasesApi as defaultApi } from "./purchasesApi.js";

function newIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export default function PurchaseOrderReceiptForm({ order, api = defaultApi, onReceived, onConflict }) {
  const navigate = useNavigate();
  const location = useLocation();
  const lines = useMemo(() => (order.items ?? []).filter((line) => Number(line.quantity_pending) > 0), [order.items]);
  const [amounts, setAmounts] = useState({});
  const [notes, setNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAttempt, setPendingAttempt] = useState(null);

  useEffect(() => {
    setAmounts(Object.fromEntries(lines.map((line) => [line.id, "0"])));
    setNotes("");
    setReviewing(false);
    setPendingAttempt(null);
  }, [order.id, lines]);

  const updateAmount = (lineId, value) => {
    if (pendingAttempt) return;
    setAmounts((current) => ({ ...current, [lineId]: value }));
    setError("");
    setMessage("");
  };

  const review = () => {
    setError("");
    const items = lines.map((line) => ({
      purchase_order_item_id: line.id,
      quantity_received: Number(amounts[line.id] || 0),
      pending: Number(line.quantity_pending),
      description: line.description_snapshot ?? line.code_snapshot ?? `Línea ${line.id}`,
    })).filter((item) => item.quantity_received > 0);
    if (!items.length || items.some((item) => !Number.isInteger(item.quantity_received) || item.quantity_received > item.pending)) {
      setError("Ingresa cantidades enteras mayores que cero y no superiores al saldo pendiente.");
      return;
    }
    setReviewing(true);
  };

  const confirm = async () => {
    const items = lines.map((line) => ({
      purchase_order_item_id: line.id,
      quantity_received: Number(amounts[line.id] || 0),
    })).filter((item) => item.quantity_received > 0);
    const payload = { items, notes: notes.trim() || null };
    const payloadText = JSON.stringify(payload);
    const attempt = pendingAttempt?.payloadText === payloadText
      ? pendingAttempt
      : { payloadText, idempotencyKey: newIdempotencyKey() };
    setPendingAttempt(attempt);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.receivePurchaseOrder(order.id, payload, attempt.idempotencyKey);
      setPendingAttempt(null);
      setReviewing(false);
      setAmounts(Object.fromEntries(lines.map((line) => [line.id, "0"])));
      setNotes("");
      setMessage(result.replayed ? "La respuesta corresponde a una recepción que ya se había registrado." : "Recepción confirmada.");
      await onReceived?.(result);
    } catch (apiError) {
      if (apiError.code === "session_required") {
        navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
        return;
      }
      setError(apiError.message);
      if (apiError.status === 409) {
        await onConflict?.();
        setPendingAttempt(null);
        setReviewing(false);
      } else if (apiError.status === 422) {
        setPendingAttempt(null);
        setReviewing(false);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!lines.length) return <div className="jobtag empty">No hay cantidades pendientes por recibir.</div>;

  return <div className="jobtag purchases-receive-form">
    {error && <FormAlert>{error}</FormAlert>}
    {message && <p className="purchases-success" role="status">{message}</p>}
    {!reviewing ? <>
      {lines.map((line) => <Field key={line.id} label={`${line.description_snapshot ?? line.code_snapshot ?? `Línea ${line.id}`} · pendiente ${line.quantity_pending}`} htmlFor={`order-receive-${line.id}`}>
        <input className="input" id={`order-receive-${line.id}`} type="number" inputMode="numeric" min="0" max={line.quantity_pending} step="1" value={amounts[line.id] ?? "0"} disabled={Boolean(pendingAttempt)} onChange={(event) => updateAmount(line.id, event.target.value)} />
      </Field>)}
      <Field label="Notas de recepción" htmlFor="order-receipt-notes"><textarea className="input" id="order-receipt-notes" rows="2" maxLength={2000} value={notes} disabled={Boolean(pendingAttempt)} onChange={(event) => setNotes(event.target.value)} /></Field>
      <button className="btn btn--primary" type="button" onClick={review}>Revisar cantidades</button>
    </> : <div className="purchases-receipt-review">
      <h3>Revisa la recepción</h3>
      <ul>{lines.filter((line) => Number(amounts[line.id]) > 0).map((line) => <li key={line.id}>{line.description_snapshot ?? line.code_snapshot ?? `Línea ${line.id}`}: {amounts[line.id]} de {line.quantity_pending} pendiente(s)</li>)}</ul>
      <p className="muted">Solo los repuestos del inventario generan un movimiento de stock. Los conceptos libres quedan registrados sin cambiar existencias.</p>
      <div className="btn-row">
        {!pendingAttempt && <button className="btn" type="button" disabled={busy} onClick={() => setReviewing(false)}>Volver a editar</button>}
        <button className="btn btn--primary" type="button" disabled={busy} onClick={confirm}>{busy ? "Confirmando…" : pendingAttempt ? "Reintentar esta recepción" : "Confirmar recepción"}</button>
      </div>
    </div>}
  </div>;
}
