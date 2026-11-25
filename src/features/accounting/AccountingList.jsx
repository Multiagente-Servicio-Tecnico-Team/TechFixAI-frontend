import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, CalendarDays, FileBarChart, Plus, Search } from "lucide-react";
import { formatAccountingAmount, parseAccountingAmount } from "../../domain/accounting.js";
import { Field, Pagination } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { accountingApi as defaultApi } from "./accountingApi.js";

const emptyFilters = { from_date: "", to_date: "", category_id: "", status: "", entry_number: "" };
const dateToday = () => new Date().toISOString().slice(0, 10);

export default function AccountingList({ api = defaultApi }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, limit: 50, offset: 0 });
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  const load = async (nextFilters = applied, nextPage = page) => {
    setState("loading"); setError("");
    try {
      const [data, categoryData] = await Promise.all([
        api.listEntries({ ...nextFilters, limit: 50, offset: (nextPage - 1) * 50 }),
        categories.length ? Promise.resolve({ items: categories }) : api.listCategories(),
      ]);
      setResult(data); setCategories(categoryData.items ?? []); setState("ready");
    } catch (e) {
      if (e.code === "session_required") { setResult({ items: [], total: 0, limit: 50, offset: 0 }); navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (e.code === "forbidden") { setResult({ items: [], total: 0, limit: 50, offset: 0 }); setCategories([]); }
      setError(e.message); setState("error");
    }
  };
  useEffect(() => { load(emptyFilters, 1); }, [api]);

  const apply = (event) => { event.preventDefault(); setApplied(filters); setPage(1); load(filters, 1); };
  const clear = () => { setFilters(emptyFilters); setApplied(emptyFilters); setPage(1); load(emptyFilters, 1); };
  const changePage = (next) => { setPage(next); load(applied, next); };
  const pages = Math.max(1, Math.ceil(result.total / (result.limit || 50)));

  return <div className="page accounting-page">
    <div className="page-head"><div><p className="kicker">REGISTRO INTERNO · PEN</p><h1 className="title">Contabilidad</h1><p className="muted">Asientos y trazabilidad del taller</p></div><Link className="btn btn--primary" to="/taller/contabilidad/nuevo"><Plus size={16} aria-hidden="true"/> Nuevo asiento</Link></div>
    <nav className="accounting-shortcuts" aria-label="Herramientas de contabilidad">
      <Link className="btn" to="/taller/contabilidad/planes"><BookOpen size={16} aria-hidden="true" /> Planes</Link>
      <Link className="btn" to="/taller/contabilidad/cuentas"><BookOpen size={16} aria-hidden="true" /> Cuentas</Link>
      <Link className="btn" to="/taller/contabilidad/periodos"><CalendarDays size={16} aria-hidden="true" /> Periodos</Link>
      <Link className="btn" to="/taller/contabilidad/informes/diario"><FileBarChart size={16} aria-hidden="true" /> Informes</Link>
    </nav>
    <form className="jobtag accounting-filters" onSubmit={apply}>
      <div className="grid-2">
        <Field label="Desde" htmlFor="accounting-from"><input className="input" id="accounting-from" type="date" value={filters.from_date} max={filters.to_date || undefined} onChange={e => setFilters({...filters, from_date:e.target.value})}/></Field>
        <Field label="Hasta" htmlFor="accounting-to"><input className="input" id="accounting-to" type="date" value={filters.to_date} min={filters.from_date || undefined} max={dateToday()} onChange={e => setFilters({...filters, to_date:e.target.value})}/></Field>
        <Field label="Categoría" htmlFor="accounting-filter-category"><select className="input" id="accounting-filter-category" value={filters.category_id} onChange={e => setFilters({...filters, category_id:e.target.value})}><option value="">Todas</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Estado" htmlFor="accounting-filter-status"><select className="input" id="accounting-filter-status" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">Todos</option><option value="CONFIRMED">Confirmado</option><option value="REVERSED">Revertido</option></select></Field>
        <Field label="Correlativo" htmlFor="accounting-filter-number"><input className="input" id="accounting-filter-number" inputMode="numeric" value={filters.entry_number} onChange={e=>setFilters({...filters,entry_number:e.target.value.replace(/\D/g,"")})}/></Field>
      </div>
      <div className="btn-row"><button className="btn btn--primary" type="submit"><Search size={15} aria-hidden="true"/> Filtrar</button><button className="btn" type="button" onClick={clear}>Limpiar filtros</button></div>
    </form>
    {state === "loading" && <p className="empty" role="status">Cargando asientos…</p>}
    {state === "error" && <><FormAlert>{error}</FormAlert><button className="btn" onClick={()=>load()} type="button">Reintentar</button></>}
    {state === "ready" && <>
      <p className="muted" aria-live="polite">{result.total} {result.total === 1 ? "asiento" : "asientos"}</p>
      {!result.items.length ? <div className="jobtag empty">{Object.values(applied).some(Boolean) ? "No hay asientos que coincidan con los filtros." : "Todavía no hay asientos registrados."}</div> : <div className="accounting-list" role="list">
        {[...result.items].sort((a,b)=>b.operation_date.localeCompare(a.operation_date) || Number(b.entry_number)-Number(a.entry_number)).map(entry=><article className="jobtag accounting-card" role="listitem" key={entry.id}>
          <div className="accounting-card__top"><Link to={`/taller/contabilidad/${entry.id}`} className="accounting-entry-number">Asiento N.º {entry.entry_number}</Link><span className={`badge ${entry.status === "REVERSED" ? "badge--warn" : "badge--ok"}`}>{entry.status === "REVERSED" ? "Revertido" : "Confirmado"}</span></div>
          <h2 className="subtitle">{entry.concept}</h2><dl className="accounting-summary"><div><dt>Fecha</dt><dd>{entry.operation_date}</dd></div><div><dt>Categoría</dt><dd>{entry.category?.name ?? "—"}</dd></div><div><dt>Monto PEN</dt><dd>{formatAccountingAmount(parseAccountingAmount(entry.amount) ?? 0n)}</dd></div><div><dt>Responsable</dt><dd>{entry.responsible?.display_name ?? "—"}</dd></div></dl>
        </article>)}
      </div>}
      <Pagination page={page} pages={pages} onChange={changePage} label={`Página ${page} de ${pages}`}/>
    </>}
  </div>;
}
