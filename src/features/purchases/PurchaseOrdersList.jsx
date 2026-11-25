import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { formatPurchaseMoney, parsePurchaseMoney, PURCHASE_ORDER_STATUS_LABELS } from "../../domain/purchases.js";
import { Field, Pagination } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { usePurchaseOrders } from "./usePurchaseOrders.js";

const PAGE_SIZE = 20;

export default function PurchaseOrdersList() {
  const orders = usePurchaseOrders();
  const [searching, setSearching] = useState(false);
  const set = (key, value) => orders.setFilters((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    setSearching(true);
    await orders.applyFilters(event);
    setSearching(false);
  };

  const hasFilters = Object.values(orders.applied).some(Boolean);
  return <div className="page purchases-page">
    <div className="page-head">
      <div>
        <p className="kicker">TALLER · ADMINISTRACIÓN</p>
        <h1 className="title">Órdenes de compra</h1>
        <p className="muted">Solicitudes a proveedores, separadas de sus comprobantes.</p>
      </div>
      <div className="btn-row">
        <Link className="btn" to="/taller/compras">Comprobantes</Link>
        <Link className="btn btn--primary" to="/taller/compras/ordenes/nuevo"><Plus size={16} aria-hidden="true" /> Nueva orden</Link>
      </div>
    </div>

    <form className="jobtag purchases-filters" onSubmit={submit}>
      <div className="grid-2">
        <Field label="Proveedor" htmlFor="order-filter-supplier">
          <select className="input" id="order-filter-supplier" value={orders.filters.supplier_id} onChange={(event) => set("supplier_id", event.target.value)}>
            <option value="">Todos</option>
            {orders.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </Field>
        <Field label="Estado" htmlFor="order-filter-status">
          <select className="input" id="order-filter-status" value={orders.filters.status} onChange={(event) => set("status", event.target.value)}>
            <option value="">Todos</option>
            {Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Desde" htmlFor="order-filter-from">
          <input className="input" id="order-filter-from" type="date" value={orders.filters.date_from} max={orders.filters.date_to || undefined} onChange={(event) => set("date_from", event.target.value)} />
        </Field>
        <Field label="Hasta" htmlFor="order-filter-to">
          <input className="input" id="order-filter-to" type="date" value={orders.filters.date_to} min={orders.filters.date_from || undefined} onChange={(event) => set("date_to", event.target.value)} />
        </Field>
      </div>
      <div className="btn-row">
        <button className="btn btn--primary" type="submit" disabled={searching}><Search size={15} aria-hidden="true" /> Filtrar</button>
        <button className="btn" type="button" onClick={orders.clearFilters}>Limpiar filtros</button>
      </div>
    </form>

    {orders.state === "loading" && <p className="empty" role="status">Cargando órdenes…</p>}
    {orders.state === "unconfigured" && <FormAlert>El servicio de Compras no está configurado en este entorno.</FormAlert>}
    {orders.state === "error" && <><FormAlert>{orders.error}</FormAlert><button className="btn" type="button" onClick={orders.reload}>Reintentar</button></>}
    {orders.state === "ready" && <>
      <p className="muted" aria-live="polite">{orders.result.total} {orders.result.total === 1 ? "orden" : "órdenes"}</p>
      {!orders.result.items.length ? <div className="jobtag empty">{hasFilters ? "No hay órdenes que coincidan con los filtros." : "Todavía no hay órdenes registradas."}</div> : <div className="purchases-list" role="list">
        {orders.result.items.map((order) => <article className="jobtag purchases-card" role="listitem" key={order.id}>
          <div className="purchases-card__top">
            <Link to={`/taller/compras/ordenes/${order.id}`} className="purchases-card__document">Orden #{order.id}</Link>
            <span className={`badge ${order.status === "RECEIVED" ? "badge--ok" : order.status === "CANCELLED" ? "badge--warn" : ""}`}>
              {PURCHASE_ORDER_STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <h2 className="subtitle">{order.supplier_name}</h2>
          <dl className="purchases-summary">
            <div><dt>Creada</dt><dd>{order.created_at ? new Date(order.created_at).toLocaleDateString("es-PE") : "—"}</dd></div>
            <div><dt>Entrega estimada</dt><dd>{order.estimated_arrival || "No indicada"}</dd></div>
            <div><dt>Total</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(order.total_amount))} · {order.currency || "PEN"}</dd></div>
          </dl>
        </article>)}
      </div>}
      <Pagination page={orders.page} pages={Math.max(1, Math.ceil(orders.result.total / (orders.result.limit || PAGE_SIZE)))} onChange={orders.changePage} label={`Página ${orders.page} de ${Math.max(1, Math.ceil(orders.result.total / (orders.result.limit || PAGE_SIZE)))}`} />
    </>}
  </div>;
}
