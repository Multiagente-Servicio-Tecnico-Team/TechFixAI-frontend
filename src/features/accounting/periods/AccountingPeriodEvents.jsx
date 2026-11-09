import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Pagination } from "../../../shared/ui/ui.jsx";
import { FormAlert } from "../../../shared/ui/FormAlert.jsx";
import { accountingApi } from "../accountingApi.js";

const PAGE_SIZE = 50;
const formatDate = (value) => value ? new Date(value).toLocaleString("es-PE") : "—";

export default function AccountingPeriodEvents() {
  const { year, month } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const load = useCallback(async (nextPage = page) => {
    setState("loading"); setError("");
    try {
      const data = await accountingApi.listPeriodEvents(year, month, { limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE });
      setResult({ items: data?.items ?? [], total: data?.total ?? 0, limit: data?.limit ?? PAGE_SIZE, offset: data?.offset ?? 0 }); setState("ready");
    } catch (cause) {
      if (cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (cause.code === "forbidden") setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
      setError(cause.message); setState("error");
    }
  }, [location.pathname, month, navigate, page, year]);
  useEffect(() => { load(1); }, [year, month]);
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  return <div className="page accounting-page">
    <Link className="back-link" to="/taller/contabilidad/periodos"><ArrowLeft size={16} aria-hidden="true" /> Periodos</Link>
    <div className="page-head"><div><p className="kicker">TRAZABILIDAD</p><h1 className="title">Historial · {year}-{String(month).padStart(2, "0")}</h1><p className="muted">Transiciones de estado registradas para este mes.</p></div></div>
    {state === "loading" && <p className="empty" role="status">Cargando historial…</p>}
    {state === "error" && <div><FormAlert>{error}</FormAlert><button type="button" className="btn" onClick={() => load()}>Reintentar</button></div>}
    {state === "ready" && (result.items.length ? <div className="accounting-list">{result.items.map((event) => <article className="jobtag accounting-audit-card" key={event.id}>
      <div className="accounting-card__top"><strong>{event.action}</strong><span>{formatDate(event.occurred_at)}</span></div><p>Responsable: usuario #{event.actor_user_id}</p>{event.reason && <p>Motivo: {event.reason}</p>}
      {(event.prior_state || event.new_state) && <details><summary>Ver estado anterior y nuevo</summary><pre>{JSON.stringify({ anterior: event.prior_state, nuevo: event.new_state }, null, 2)}</pre></details>}
    </article>)}</div> : <div className="jobtag empty">No hay eventos registrados para este periodo.</div>)}
    {state === "ready" && <Pagination page={page} pages={pages} onChange={(next) => { setPage(next); load(next); }} label={`Página ${page} de ${pages}`} />}
  </div>;
}
