import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Field } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog.jsx";
import { formatAccountingAmount, parseAccountingAmount } from "../../domain/accounting.js";
import { accountingApi as defaultApi } from "./accountingApi.js";

const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => formatAccountingAmount(parseAccountingAmount(value ?? "0.00") ?? 0n);
const eventNames = { ENTRY_CREATED: "Asiento registrado", ENTRY_REVERSED: "Asiento revertido", REVERSAL_CREATED: "Asiento compensatorio creado" };

export default function AccountingDetail({ api = defaultApi }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [entry, setEntry] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [reverseOpen, setReverseOpen] = useState(false);
  const [operationDate, setOperationDate] = useState(today());
  const [reason, setReason] = useState("");
  const [reverseError, setReverseError] = useState("");
  const [reversing, setReversing] = useState(false);
  const [reversal, setReversal] = useState(null);

  const load = useCallback(async () => {
    setState("loading"); setError("");
    try { setEntry(await api.getEntry(id)); setState("ready"); }
    catch (e) {
      if (e.code === "session_required") { setEntry(null); navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      setError(e.message); setState("error");
    }
  }, [api, id, location.pathname, navigate]);
  useEffect(() => { load(); }, [load]);

  const submitReversal = async () => {
    if (!operationDate || !reason.trim() || reason.trim().length > 2000) {
      setReverseError(!operationDate ? "Ingresa la fecha de operación." : "La razón es obligatoria y admite hasta 2000 caracteres.");
      return;
    }
    if (reversing) return;
    setReversing(true); setReverseError("");
    try {
      const result = await api.reverseEntry(id, { operation_date: operationDate, reason: reason.trim() });
      setReversal(result.reversal);
      setReverseOpen(false);
      try {
        setEntry(await api.getEntry(id));
      } catch {
        setEntry((current) => ({ ...current, ...result.original }));
        setReverseError("La reversión se registró, pero no se pudo actualizar el detalle. Intenta recargarlo.");
      }
    } catch (e) {
      if (e.code === "session_required") { setEntry(null); setReverseOpen(false); navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (e.status === 409 || e.code === "conflict") {
        try { setEntry(await api.getEntry(id)); setReverseError("El asiento cambió o ya fue revertido. Se actualizó su estado."); setReverseOpen(false); }
        catch (refreshError) { setReverseError(refreshError.message); }
      } else setReverseError(e.message);
    } finally { setReversing(false); }
  };

  if (state === "loading") return <div className="page accounting-page"><p className="empty" role="status">Cargando asiento…</p></div>;
  if (state === "error") return <div className="page accounting-page"><FormAlert>{error}</FormAlert><button type="button" className="btn" onClick={load}>Reintentar</button><Link className="btn" to="/taller/contabilidad">Volver a Contabilidad</Link></div>;

  const canReverse = entry.status === "CONFIRMED" && !entry.reversal_entry_id && !entry.reversal_of_entry_id;
  return <div className="page accounting-page">
    <Link className="back-link" to="/taller/contabilidad"><ArrowLeft size={16} aria-hidden="true"/> Contabilidad</Link>
    <div className="page-head"><div><p className="kicker">DETALLE DEL ASIENTO</p><h1 className="title">Asiento N.º {entry.entry_number}</h1></div><span className={`badge ${entry.status === "REVERSED" ? "badge--warn" : "badge--ok"}`}>{entry.status === "REVERSED" ? "Revertido" : "Confirmado"}</span></div>
    {!reverseOpen && <FormAlert>{reverseError}</FormAlert>}
    {reversal && <div className="jobtag accounting-success" role="status"><strong>Reversión confirmada: </strong><Link to={`/taller/contabilidad/${reversal.id}`}>Asiento N.º {reversal.entry_number}</Link></div>}
    <section className="jobtag accounting-section"><h2 className="subtitle">Resumen</h2><dl className="accounting-summary accounting-summary--detail">
      <div><dt>Fecha de operación</dt><dd>{entry.operation_date}</dd></div><div><dt>Categoría</dt><dd>{entry.category?.name ?? "—"}</dd></div><div><dt>Concepto</dt><dd>{entry.concept}</dd></div><div><dt>Detalle</dt><dd>{entry.detail}</dd></div><div><dt>Moneda</dt><dd>PEN</dd></div><div><dt>Debe</dt><dd>{money(entry.debit_total)}</dd></div><div><dt>Haber</dt><dd>{money(entry.credit_total)}</dd></div><div><dt>Monto</dt><dd>{money(entry.amount)}</dd></div><div><dt>Responsable</dt><dd>{entry.responsible?.display_name ?? "—"}</dd></div><div><dt>Creado</dt><dd>{entry.created_at}</dd></div><div><dt>Actualizado</dt><dd>{entry.updated_at}</dd></div>{entry.reversed_at && <div><dt>Revertido</dt><dd>{entry.reversed_at}</dd></div>}
    </dl></section>
    <section className="accounting-section"><h2 className="subtitle">Líneas contables</h2><div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Línea</th><th>Código</th><th>Cuenta</th><th>Descripción</th><th>Debe</th><th>Haber</th></tr></thead><tbody>{[...entry.lines].sort((a,b)=>a.line_number-b.line_number).map(line=><tr key={line.line_number}><td data-label="Línea">{line.line_number}</td><td data-label="Código">{line.account_code}</td><td data-label="Cuenta">{line.account_name}</td><td data-label="Descripción">{line.description || "—"}</td><td data-label="Debe">{money(line.debit)}</td><td data-label="Haber">{money(line.credit)}</td></tr>)}</tbody></table></div></section>
    {(entry.reversal_of_entry_id || entry.reversal_entry_id) && <p className="jobtag">{entry.reversal_of_entry_id ? "Reversa de" : "Revertido por"}: <Link to={`/taller/contabilidad/${entry.reversal_of_entry_id ?? entry.reversal_entry_id}`}>ver asiento relacionado</Link></p>}
    <section className="accounting-section"><h2 className="subtitle">Trazabilidad</h2>{entry.audit_events?.length ? <ol className="accounting-timeline">{[...entry.audit_events].sort((a,b)=>a.created_at.localeCompare(b.created_at)).map((event,index)=><li key={`${event.event_type}-${index}`}><strong>{eventNames[event.event_type] ?? event.event_type}</strong><p>{event.actor?.display_name ?? "Usuario"} · {event.created_at}</p>{event.reason && <p>Motivo: {event.reason}</p>}{event.related_entry_id && <Link to={`/taller/contabilidad/${event.related_entry_id}`}>Asiento relacionado</Link>}</li>)}</ol> : <p className="muted">No hay eventos de auditoría disponibles.</p>}</section>
    {canReverse && <button className="btn btn--danger" type="button" onClick={()=>{setReverseError("");setReverseOpen(true);}}><RotateCcw size={16} aria-hidden="true"/> Revertir asiento</button>}
    <ConfirmDialog open={reverseOpen} title="Registrar reversión" confirmLabel="Confirmar reversión" busy={reversing} error={reverseError} onConfirm={submitReversal} onCancel={()=>setReverseOpen(false)}>
      <p>Se creará un nuevo asiento compensatorio con los importes invertidos y el original quedará revertido.</p>
      <Field label="Fecha de operación" htmlFor="reversal-date" required><input className="input" id="reversal-date" type="date" value={operationDate} max={today()} onChange={e=>setOperationDate(e.target.value)}/></Field>
      <Field label="Razón" htmlFor="reversal-reason" required><textarea className="input textarea" id="reversal-reason" maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></Field>
    </ConfirmDialog>
  </div>;
}
