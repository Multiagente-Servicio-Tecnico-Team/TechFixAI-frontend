import { Outlet } from "react-router-dom";
import { useStore } from "../../state/store.jsx";
import { ticketsApi } from "./ticketsApi.js";
import TicketAccessDenied from "./TicketAccessDenied.jsx";

export default function TicketAdminRoute({ children }) {
  const { session } = useStore();
  if (ticketsApi.mode === "demo" || session?.accountRole === "ADMIN") return children || <Outlet />;
  return <TicketAccessDenied />;
}
