function PresentationFields({ fields = [] }) {
  if (!fields.length) return null;
  return (
    <dl className="admin-chat-data__fields">
      {fields.map((field, index) => (
        <div key={`${field.label}-${index}`}>
          <dt>{field.label}</dt>
          <dd>{field.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function PresentationTable({ presentation }) {
  const columns = presentation.columns ?? [];
  const rows = presentation.rows ?? [];
  if (!rows.length) return <p className="small muted">{presentation.empty_message || "No hay registros para mostrar."}</p>;
  if (!columns.length) return <p className="small muted">{presentation.summary || `${rows.length} resultados`}</p>;
  return (
    <div className="admin-chat-data__table-wrap" role="region" aria-label={presentation.title} tabIndex={0}>
      <table className="admin-chat-data__table" aria-label={presentation.title}>
        <thead><tr>{columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.id ?? row.code ?? "row"}-${rowIndex}`}>
              {columns.map((column) => (
                <td key={column.key}>{row[column.key] || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PresentationSection({ section, resourceUrl }) {
  if (!section || typeof section !== "object") return null;
  return (
    <section className="admin-chat-data__section">
      <strong>{section.title}</strong>
      {section.kind === "table" ? <PresentationTable presentation={section} /> : null}
      {section.kind === "record" ? <PresentationFields fields={section.fields} /> : null}
      {section.kind === "list" && (section.items ?? []).length > 0 ? (
        <ul>{section.items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
      ) : null}
      {(section.sections ?? []).map((child, index) => (
        <PresentationSection key={`${child.title}-${index}`} section={child} resourceUrl={resourceUrl} />
      ))}
    </section>
  );
}

export default function AdminChatPresentation({ presentation, resourceUrl = (url) => url }) {
  if (!presentation || typeof presentation !== "object") return null;
  const { kind, title, summary } = presentation;
  return (
    <section className="admin-chat-data" aria-label={title || "Datos de la consulta"}>
      <div className="admin-chat-data__head">
        <strong>{title || "Resultado"}</strong>
        {summary && <span className="stamp">{summary}</span>}
      </div>
      {kind === "table" ? <PresentationTable presentation={presentation} /> : null}
      {kind === "record" ? <PresentationFields fields={presentation.fields} /> : null}
      {kind === "list" && (presentation.items ?? []).length > 0 ? (
        <ul>{presentation.items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
      ) : null}
      {(presentation.sections ?? []).map((section, index) => (
        <PresentationSection key={`${section.title}-${index}`} section={section} resourceUrl={resourceUrl} />
      ))}
      {kind === "download" && presentation.download_url && (
        <a className="btn btn--sm" href={resourceUrl(presentation.download_url)}>
          {presentation.download_label || "Descargar"}
        </a>
      )}
    </section>
  );
}
