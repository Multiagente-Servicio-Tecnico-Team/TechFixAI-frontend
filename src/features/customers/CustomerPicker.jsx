import { useState } from "react";
import { Search, UserRoundPlus } from "lucide-react";
import { Field } from "../../shared/ui/ui.jsx";
import { customersApi as defaultApi } from "./customersApi.js";

const emptyDraft = { display_name: "", phone: "", email: "" };

export default function CustomerPicker({ value, onChange, api = defaultApi, label = "Cliente comercial" }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchCustomers = async () => {
    setLoading(true); setError("");
    try {
      const page = await api.list({ search: search.trim(), limit: 50, offset: 0 });
      setResults(page.items);
    } catch (e) { setError(e.message || "No se pudo buscar clientes."); }
    finally { setLoading(false); }
  };

  const select = (customer) => {
    onChange(customer);
    setCreating(false);
    setError("");
  };

  const create = async () => {
    const display_name = draft.display_name.trim();
    const phone = draft.phone.trim();
    if (display_name.length < 2 || display_name.length > 200 || phone.length < 7 || phone.length > 30) {
      setError("Ingresa un nombre de 2 a 200 caracteres y un teléfono de 7 a 30 caracteres.");
      return;
    }
    setLoading(true); setError("");
    try {
      const customer = await api.create({ ...draft, display_name, phone });
      setDraft(emptyDraft);
      select(customer);
    } catch (e) { setError(e.message || "No se pudo registrar el cliente."); }
    finally { setLoading(false); }
  };

  return (
    <div className="customer-picker" aria-label={label}>
      <h3 className="subtitle">{label}</h3>
      {value ? (
        <div className="customer-picker__selected" role="status">
          <div><strong>{value.name ?? value.display_name}</strong><span>{value.phone} · {value.email || "Sin correo"}</span><small>{value.originLabel ?? "Cliente seleccionado"}</small></div>
          <button className="btn btn--sm" type="button" onClick={() => onChange(null)}>Cambiar cliente</button>
        </div>
      ) : (
        <>
          <div className="customer-picker__search">
            <Field label="Buscar por nombre, correo o teléfono" htmlFor="customer-search">
              <input id="customer-search" className="input" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={200} />
            </Field>
            <button type="button" className="btn" disabled={loading} onClick={searchCustomers}><Search size={16} aria-hidden="true" />{loading ? "Buscando…" : "Buscar"}</button>
          </div>
          {results.length > 0 && <ul className="customer-picker__results" aria-label="Resultados de clientes">{results.map((customer) => (
            <li key={customer.id}><button type="button" className="customer-picker__option" disabled={customer.active === false} onClick={() => select(customer)}>
              <span><strong>{customer.name}</strong><small>{customer.phone} · {customer.email || "Sin correo"}</small></span><small>{customer.originLabel}{customer.accountLinked ? " · Cuenta vinculada" : " · Sin cuenta"}</small>
              {!customer.active && <small>Cliente inactivo</small>}
            </button></li>
          ))}</ul>}
          {search && !loading && results.length === 0 && <p className="small muted">No se encontraron coincidencias. Confirma los datos antes de crear un cliente manual.</p>}
          <button type="button" className="btn btn--sm" onClick={() => { setCreating((current) => !current); setError(""); }}><UserRoundPlus size={15} aria-hidden="true" />{creating ? "Cancelar alta manual" : "Registrar cliente sin cuenta"}</button>
          {creating && <div className="customer-picker__create">
            <p className="small muted">Se crea un perfil comercial sin cuenta de acceso ni contraseña.</p>
            <Field label="Nombre o razón social" htmlFor="customer-name" required><input id="customer-name" className="input" maxLength={200} required value={draft.display_name} onChange={(event) => setDraft({ ...draft, display_name: event.target.value })} /></Field>
            <Field label="Teléfono" htmlFor="customer-phone" required><input id="customer-phone" className="input" maxLength={30} required value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></Field>
            <Field label="Correo (opcional)" htmlFor="customer-email"><input id="customer-email" className="input" type="email" maxLength={255} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></Field>
            <button type="button" className="btn btn--primary" disabled={loading} onClick={create}>{loading ? "Guardando…" : "Crear y seleccionar"}</button>
          </div>}
          {error && <p className="form-alert" role="alert">{error}</p>}
        </>
      )}
    </div>
  );
}
