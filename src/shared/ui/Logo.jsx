import { Link } from "react-router-dom";

/** Símbolo de la marca: etiqueta de taller perforada con la T recortada. */
export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d="M5 4h27l11 11v29H5zM14 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 22v6h9v11h7V28h9v-6z" />
    </svg>
  );
}

export default function Logo({ to = "/" }) {
  return (
    <Link to={to} className="logo" aria-label="TechFix.AI inicio">
      <LogoMark />
      <span>TechFix.AI</span>
    </Link>
  );
}
