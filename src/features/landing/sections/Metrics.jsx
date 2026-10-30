import Eyebrow from "../../../shared/ui/Eyebrow.jsx";

const metrics = [
  { label: "Tiempo de diagnóstico", value: "−38%", note: "De ingreso a cotización lista" },
  { label: "Tickets por coordinador", value: "2.4×", note: "Sin aumentar retrabajo" },
  { label: "Aprobaciones sin llamada", value: "94%", note: "Desde portal o mensajería" },
  { label: "Stock inmovilizado", value: "−27%", note: "Reservas y alertas anticipadas" },
];

export default function Metrics() {
  return (
    <section className="metrics">
      <div className="container">
        <Eyebrow>Valor operativo medible</Eyebrow>
        <h2 className="h2">Más capacidad sin perder precisión ni trazabilidad</h2>
        <dl className="metrics__grid">
          {metrics.map(({ label, value, note }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className="metrics__value">{value}</dd>
              <dd>{note}</dd>
            </div>
          ))}
        </dl>
        <p className="metrics__source">
          Resultados de una operación piloto de 90 días en un taller multimarca con 1,200 tickets mensuales.
        </p>
      </div>
    </section>
  );
}
