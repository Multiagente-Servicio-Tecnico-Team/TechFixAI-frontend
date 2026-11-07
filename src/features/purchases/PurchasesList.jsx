import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Plus, Search } from "lucide-react";
import { formatPurchaseMoney, parsePurchaseMoney, PURCHASE_STATUS_LABELS, PAYMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS } from "../../domain/purchases.js";
import { Field, Pagination } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { usePurchases } from "./usePurchases.js";

const PAGE_SIZE = 20;

export default function PurchasesList({ api }) {
  const { filters, setFilters, applied, page, result, listState, error, suppliers, applyFilters, clearFilters, changePage, reload } = usePurchases(api);
  const [searching, setSearching] = useState(false);
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    setSearching(true);
    await applyFilters(event);
    setSearching(false);
  };

  return <div className="page purchases-page">
    <div className="page-head">
      <div><p className="kicker">TALLER · ADMINISTRACIÓN</p><h1 className="title">Compras</h1><p className="muted">Comprobantes, proveedores y recepciones</p></div>
      <div className="btn-row"><Link className="btn" to="/taller/compras/proveedores"><Building2 size={16} aria-hidden="true" /> Proveedores</Link>
      <Link className="btn btn--primary" to="/taller/compras/nuevo"><Plus size={16} aria-hidden="true" /> Registrar compra</Link></div>
    </div>

    <form className="jobtag purchases-filters" onSubmit={submit}>
      <div className="grid-2">
        <Field label="Proveedor" htmlFor="purchase-filter-supplier"><select className="input" id="purchase-filter-supplier" value={filters.supplier_id} onChange={(event) => set("supplier_id", event.target.value)}><option value="">Todos</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}{supplier.active ? "" : " (inactivo)"}</option>)}</select></Field>
        <Field label="Número de comprobante" htmlFor="purchase-filter-number"><input className="input" id="purchase-filter-number" value={filters.document_number} onChange={(event) => set("document_number", event.target.value)} maxLength={40} /></Field>
        <Field label="Desde" htmlFor="purchase-filter-from"><input className="input" id="purchase-filter-from" type="date" value={filters.from_date} max={filters.to_date || undefined} onChange={(event) => set("from_date", event.target.value)} /></Field>
        <Field label="Hasta" htmlFor="purchase-filter-to"><input className="input" id="purchase-filter-to" type="date" value={filters.to_date} min={filters.from_date || undefined} onChange={(event) => set("to_date", event.target.value)} /></Field>
        <Field label="Recepción" htmlFor="purchase-filter-status"><select className="input" id="purchase-filter-status" value={filters.status} onChange={(event) => set("status", event.target.value)}><option value="">Todos</option>{Object.entries(PURCHASE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <Field label="Pago" htmlFor="purchase-filter-payment"><select className="input" id="purchase-filter-payment" value={filters.payment_status} onChange={(event) => set("payment_status", event.target.value)}><option value="">Todos</option>{Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
      </div>
      <div className="btn-row"><button className="btn btn--primary" type="submit" disabled={searching}><Search size={15} aria-hidden="true" /> Filtrar</button><button className="btn" type="button" onClick={clearFilters}>Limpiar filtros</button></div>
    </form>

    {listState === "loading" && <p className="empty" role="status">Cargando compras…</p>}
    {listState === "unconfigured" && <FormAlert>{error || "El servicio de Compras no está configurado en este entorno."}</FormAlert>}
    {listState === "error" && <><FormAlert>{error}</FormAlert><button className="btn" type="button" onClick={reload}>Reintentar</button></>}
    {listState === "ready" && <>
      <p className="muted" aria-live="polite">{result.total} {result.total === 1 ? "compra" : "compras"}</p>
      {!result.items.length ? <div className="jobtag empty">{Object.values(applied).some(Boolean) ? "No hay compras que coincidan con los filtros." : "Todavía no hay compras registradas."}</div> : <div className="purchases-list" role="list">
        {result.items.map((purchase) => <article className="jobtag purchases-card" role="listitem" key={purchase.id}>
          <div className="purchases-card__top"><Link to={`/taller/compras/${purchase.id}`} className="purchases-card__document">{DOCUMENT_TYPE_LABELS[purchase.document_type] ?? purchase.document_type} {purchase.document_number}</Link><span className={`badge ${purchase.status === "RECEIVED" ? "badge--ok" : purchase.status === "CANCELLED" ? "badge--warn" : ""}`}>{PURCHASE_STATUS_LABELS[purchase.status] ?? purchase.status}</span></div>
          <h2 className="subtitle">{purchase.supplier_name}</h2>
          <dl className="purchases-summary"><div><dt>Fecha</dt><dd>{purchase.issue_date}</dd></div><div><dt>Total</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(purchase.total_amount))}</dd></div><div><dt>Pago</dt><dd>{PAYMENT_STATUS_LABELS[purchase.payment_status] ?? purchase.payment_status}</dd></div></dl>
        </article>)}
      </div>}
      <Pagination page={page} pages={Math.max(1, Math.ceil(result.total / (result.limit || PAGE_SIZE)))} onChange={changePage} label={`Página ${page} de ${Math.max(1, Math.ceil(result.total / (result.limit || PAGE_SIZE)))}`} />
    </>}
  </div>;
}
