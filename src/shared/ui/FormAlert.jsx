import { TriangleAlert } from "lucide-react";

export function FormAlert({ children }) {
  if (!children) return null;
  return (
    <div className="form-alert" role="alert">
      <TriangleAlert size={16} aria-hidden="true" /> <span>{children}</span>
    </div>
  );
}
