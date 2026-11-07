import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Search, UserRoundPlus } from "lucide-react";
import { Field, Pagination } from "../../shared/ui/ui.jsx";
import { customersApi as defaultApi } from "./customersApi.js";

const PAGE_SIZE = 25;

export default function CustomerManager({ api = defaultApi }) {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [appliedOrigin, setAppliedOrigin] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ display_name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ display_name: "", phone: "", email: "" });

  const load = useCallback(async (term = appliedSearch, nextPage = page, nextOrigin = appliedOrigin) => {
    setLoading(true); setError("");
    try {
      const data = await api.list({ search: term, origin: nextOrigin || undefined, limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE });
      setResult(data);
    } catch (e) { setResult({ items: [], total: 0 }); setError(e.message || "No se pudieron cargar los clientes."); }
    finally { setLoading(false); }
  }, [api, appliedSearch, appliedOrigin, page]);

  useEffect(() => { load(); }, [load]);

  const applySearch = (event) => { event.preventDefault(); setPage(1); setAppliedSearch(search.trim()); setAppliedOrigin(origin); };
  const create = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await api.create({ ...draft, display_name: draft.display_name.trim(), phone: draft.phone.trim(), email: draft.email.trim() || null });
      setDraft({ display_name: "", phone: "", email: "" }); setFormOpen(false); setNotice("Cliente comercial registrado.");
      await load(appliedSearch, page, appliedOrigin);
    } catch (e) { setError(e.message || "No se pudo registrar el cliente."); }
    finally { setSaving(false); }
  };

  const beginEdit = (customer) => {
    setEditingId(customer.id);
    setEditDraft({ display_name: customer.name, phone: customer.phone, email: customer.email || "" });
    setError(""); setNotice("");
  };
  const saveEdit = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await api.update(editingId, { ...editDraft, email: editDraft.email.trim() || null });
      setEditingId(null); setNotice("Datos comerciales actualizados."); await load(appliedSearch, page, appliedOrigin);
    } catch (e) { setError(e.message || "No se pudieron actualizar los datos."); }
    finally { setSaving(false); }
  };

  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  return (
    <div className="page commerce-page">
      <Link className="back-link" to="/taller">Volver al Banco</Link>
      <div className="page-head"><div><p className="kicker">Administración</p><h1 className="title">Clientes comerciales</h1></div><button className="btn btn--primary" type="button" onClick={() => setFormOpen((value) => !value)}><UserRoundPlus size={16} aria-hidden="true" />{formOpen ? "Cerrar formulario" : "Registrar cliente"}</button></div>
      <p className="muted">Los clientes presenciales pueden registrarse sin crear cuenta ni credenciales. Las coincidencias de contacto no se enlazan automáticamente.</p>
      {notice && <p className="form-alert" role="status">{notice}</p>}
      {formOpen && <form className="jobtag commerce-card commerce-form" onSubmit={create}>
        <h2 className="subtitle">Nuevo cliente comercial</h2>
        <Field label="Nombre o razón social" htmlFor="customer-manager-name" required><input id="customer-manager-name" className="input" minLength={2} maxLength={200} required value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} /></Field>
        <Field label="Teléfono" htmlFor="customer-manager-phone" required><input id="customer-manager-phone" className="input" minLength={7} maxLength={30} required value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
        <Field label="Correo (opcional)" htmlFor="customer-manager-email"><input id="customer-manager-email" className="input" type="email" maxLength={255} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
        <button className="btn btn--primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar cliente"}</button>
      </form>}
      <form className="customer-search" onSubmit={applySearch}><Field label="Buscar clientes" htmlFor="customer-manager-search"><input id="customer-manager-search" className="input" maxLength={200} placeholder="Nombre, correo o teléfono" value={search} onChange={(e) => setSearch(e.target.value)} /></Field><Field label="Origen" htmlFor="customer-manager-origin"><select id="customer-manager-origin" className="input" value={origin} onChange={(e) => setOrigin(e.target.value)}><option value="">Todos</option><option value="PORTAL">Portal</option><option value="MANUAL">Presencial</option></select></Field><button className="btn" type="submit"><Search size={16} aria-hidden="true" /> Buscar</button></form>
      {error && <div className="retry"><p role="alert">{error}</p><button className="btn btn--sm" type="button" onClick={() => load()}><RotateCcw size={14} aria-hidden="true" /> Reintentar</button></div>}
      {loading ? <p className="empty" role="status">Cargando clientes…</p> : !error && result.items.length === 0 ? <p className="empty">No hay clientes que coincidan.</p> : <>
        <div className="commerce-grid">{result.items.map((customer) => <article className="jobtag commerce-card" key={customer.id}>
          <div className="commerce-card__head"><div><p className="kicker">Cliente #{customer.id}</p><h2 className="subtitle">{customer.name}</h2></div><span className="stamp">{customer.originLabel}</span></div>
          <p>{customer.phone}</p><p>{customer.email || "Sin correo"}</p>
          <p className="small muted">{customer.accountLinked ? "Cuenta del portal vinculada" : "Sin cuenta de acceso"}</p>
          {!customer.active && <span className="stamp stamp--warn">Inactivo</span>}
          {editingId === customer.id ? <form className="commerce-form" onSubmit={saveEdit}>
            <Field label="Nombre o razón social" htmlFor={`edit-customer-name-${customer.id}`} required><input id={`edit-customer-name-${customer.id}`} className="input" minLength={2} maxLength={200} required value={editDraft.display_name} onChange={(e) => setEditDraft({ ...editDraft, display_name: e.target.value })} /></Field>
            <Field label="Teléfono" htmlFor={`edit-customer-phone-${customer.id}`} required><input id={`edit-customer-phone-${customer.id}`} className="input" minLength={7} maxLength={30} required value={editDraft.phone} onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })} /></Field>
            <Field label="Correo (opcional)" htmlFor={`edit-customer-email-${customer.id}`}><input id={`edit-customer-email-${customer.id}`} className="input" type="email" maxLength={255} value={editDraft.email} onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })} /></Field>
            <div className="btn-row"><button className="btn btn--primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button><button className="btn" type="button" onClick={() => setEditingId(null)}>Cancelar</button></div>
          </form> : <button className="btn btn--sm" type="button" onClick={() => beginEdit(customer)}>Editar datos comerciales</button>}
        </article>)}</div>
        <Pagination page={page} pages={pages} onChange={setPage} label={`${result.total} clientes`} />
      </>}
    </div>
  );
}
