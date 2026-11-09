import { TriangleAlert } from "lucide-react";

export function FormAlert({ children, role = "alert" }) {
  if (!children) return null;
  return (
    <div className="form-alert" role={role}>
      <TriangleAlert size={16} aria-hidden="true" /> <span>{children}</span>
    </div>
  );
}
