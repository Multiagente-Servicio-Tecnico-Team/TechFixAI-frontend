import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Field, Pagination } from "../../shared/ui/ui.jsx";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { purchasesApi as defaultApi } from "./purchasesApi.js";

const PAGE_SIZE = 20;
const emptyDraft = () => ({ name: "", tax_id: "", contact_name: "", contact_email: "", phone: "", address: "", delivery_lead_days: "" });

export default function SupplierManager({ api = defaultApi }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, limit: PAGE_SIZE });
  const [state, setState] = useState(api.mode === "unconfigured" ? "unconfigured" : "loading");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [disableTarget, setDisableTarget] = useState(null);

  const load = useCallback(async (query, nextPage) => {
    setState("loading"); setError("");
    try {
      const data = await api.listSuppliers({ search: query, limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE });
      setResult(data); setState("ready");
    } catch (apiError) {
      if (apiError.code === "session_required") { setResult({ items: [], total: 0, limit: PAGE_SIZE }); navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      setError(apiError.message); setState(apiError.code === "unconfigured" ? "unconfigured" : "error");
    }
  }, [api, navigate, location]);

  useEffect(() => { if (api.mode === "unconfigured") setState("unconfigured"); else load("", 1); }, [api, load]);

  const beginEdit = (supplier) => {
    setEditing(supplier);
    setDraft({ name: supplier.name ?? "", tax_id: supplier.tax_id ?? "", contact_name: supplier.contact_name ?? "", contact_email: supplier.contact_email ?? "", phone: supplier.phone ?? "", address: supplier.address ?? "", delivery_lead_days: supplier.delivery_lead_days == null ? "" : String(supplier.delivery_lead_days) });
    setError("");
  };
  const cancelEdit = () => { setEditing(null); setDraft(emptyDraft()); setError(""); };

  const save = async (event) => {
    event.preventDefault();
    if (!draft.name.trim()) { setError("Ingresa la razón social del proveedor."); return; }
    const days = draft.delivery_lead_days === "" ? null : Number(draft.delivery_lead_days);
    if (days !== null && (!Number.isInteger(days) || days < 0)) { setError("El plazo de entrega debe ser un número entero igual o mayor que cero."); return; }
    const payload = { name: draft.name.trim(), tax_id: draft.tax_id.trim() || null, contact_name: draft.contact_name.trim() || null, contact_email: draft.contact_email.trim() || null, phone: draft.phone.trim() || null, address: draft.address.trim() || null, delivery_lead_days: days };
    setSaving(true); setError("");
    try {
      if (editing) await api.updateSupplier(editing.id, payload);
      else await api.createSupplier(payload);
      cancelEdit();
      setApplied(""); setSearch(""); setPage(1);
      await load("", 1);
    } catch (apiError) {
      if (apiError.code === "session_required") navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
      else setError(apiError.message);
    } finally { setSaving(false); }
  };

  const disable = async () => {
    if (!disableTarget) return;
    setSaving(true); setError("");
    try { await api.updateSupplier(disableTarget.id, { active: false }); setDisableTarget(null); await load(applied, page); }
    catch (apiError) {
      if (apiError.code === "session_required") navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
      else setError(apiError.message);
    } finally { setSaving(false); }
  };

  const submitSearch = (event) => { event.preventDefault(); setApplied(search.trim()); setPage(1); load(search.trim(), 1); };
  const changePage = (next) => { setPage(next); load(applied, next); };
  const pages = Math.max(1, Math.ceil(result.total / (result.limit || PAGE_SIZE)));
  const changeDraft = (key, value) => { setDraft((current) => ({ ...current, [key]: value })); setError(""); };

  if (state === "unconfigured") return <div className="page purchases-page"><Link className="back-link" to="/taller/compras"><ArrowLeft size={15} aria-hidden="true" /> Compras</Link><FormAlert>El servicio de Compras no está configurado.</FormAlert></div>;

  return <div className="page purchases-page">
    <Link className="back-link" to="/taller/compras"><ArrowLeft size={15} aria-hidden="true" /> Compras</Link>
    <div className="page-head"><div><p className="kicker">ADMINISTRACIÓN</p><h1 className="title">Proveedores</h1><p className="muted">Los proveedores inactivos se conservan en las compras históricas.</p></div></div>
    {error && <FormAlert>{error}</FormAlert>}
    <form className="jobtag purchases-filters" onSubmit={submitSearch}><div className="purchases-search"><Field label="Buscar proveedor" htmlFor="supplier-search"><input id="supplier-search" className="input" value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Razón social o identificación tributaria" /></Field><button className="btn btn--primary" type="submit"><Search size={15} aria-hidden="true" /> Buscar</button></div></form>

    <form className="jobtag purchases-form__section" onSubmit={save} noValidate><h2 className="subtitle">{editing ? "Editar proveedor" : "Nuevo proveedor"}</h2><div className="grid-2">
      <Field label="Razón social" htmlFor="supplier-name" required><input className="input" id="supplier-name" maxLength={200} value={draft.name} onChange={(event) => changeDraft("name", event.target.value)} /></Field>
      <Field label="RUC / identificación tributaria" htmlFor="supplier-tax-id"><input className="input" id="supplier-tax-id" maxLength={20} value={draft.tax_id} onChange={(event) => changeDraft("tax_id", event.target.value)} /></Field>
      <Field label="Persona de contacto" htmlFor="supplier-contact"><input className="input" id="supplier-contact" maxLength={200} value={draft.contact_name} onChange={(event) => changeDraft("contact_name", event.target.value)} /></Field>
      <Field label="Correo" htmlFor="supplier-email"><input className="input" id="supplier-email" type="email" maxLength={255} value={draft.contact_email} onChange={(event) => changeDraft("contact_email", event.target.value)} /></Field>
      <Field label="Teléfono" htmlFor="supplier-phone"><input className="input" id="supplier-phone" maxLength={30} value={draft.phone} onChange={(event) => changeDraft("phone", event.target.value)} /></Field>
      <Field label="Plazo estimado de entrega (días)" htmlFor="supplier-lead"><input className="input" id="supplier-lead" type="number" min="0" step="1" value={draft.delivery_lead_days} onChange={(event) => changeDraft("delivery_lead_days", event.target.value)} /></Field>
      <Field label="Dirección" htmlFor="supplier-address"><textarea className="input" id="supplier-address" rows="2" value={draft.address} onChange={(event) => changeDraft("address", event.target.value)} /></Field>
    </div><div className="btn-row"><button className="btn btn--primary" type="submit" disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Registrar proveedor"}</button>{editing && <button className="btn" type="button" onClick={cancelEdit}>Cancelar edición</button>}</div></form>

    {state === "loading" && <p className="empty" role="status">Cargando proveedores…</p>}
    {state === "error" && <><FormAlert>{error}</FormAlert><button className="btn" type="button" onClick={() => load(applied, page)}>Reintentar</button></>}
    {state === "ready" && <><div className="purchases-list" role="list">{result.items.length ? result.items.map((supplier) => <article className="jobtag purchases-card" role="listitem" key={supplier.id}>
      <div className="purchases-card__top"><h2 className="subtitle">{supplier.name}</h2><span className={`badge ${supplier.active ? "badge--ok" : "badge--warn"}`}>{supplier.active ? "Activo" : "Inactivo"}</span></div>
      <dl className="purchases-summary"><div><dt>Identificación</dt><dd>{supplier.tax_id || "—"}</dd></div><div><dt>Contacto</dt><dd>{supplier.contact_name || "—"}</dd></div><div><dt>Correo</dt><dd>{supplier.contact_email || "—"}</dd></div><div><dt>Teléfono</dt><dd>{supplier.phone || "—"}</dd></div><div><dt>Entrega</dt><dd>{supplier.delivery_lead_days == null ? "—" : `${supplier.delivery_lead_days} días`}</dd></div></dl>
      <div className="btn-row"><button className="btn" type="button" onClick={() => beginEdit(supplier)}>Editar</button>{supplier.active && <button className="btn btn--danger" type="button" onClick={() => setDisableTarget(supplier)}>Desactivar</button>}</div>
    </article>) : <div className="jobtag empty">No hay proveedores que coincidan con la búsqueda.</div>}</div><Pagination page={page} pages={pages} onChange={changePage} label={`Página ${page} de ${pages}`} /></>}
    <ConfirmDialog open={Boolean(disableTarget)} title="Desactivar proveedor" confirmLabel="Desactivar" busyLabel="Desactivando…" busy={saving} onConfirm={disable} onCancel={() => setDisableTarget(null)}>{disableTarget ? `“${disableTarget.name}” dejará de estar disponible para nuevas compras. Las compras históricas se conservan.` : ""}</ConfirmDialog>
  </div>;
}
