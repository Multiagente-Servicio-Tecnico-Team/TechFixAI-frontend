import { Route, Routes } from "react-router-dom";
import { RequireRole, ScrollManager } from "../shared/ui/ui.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import PortalLayout from "./layouts/PortalLayout.jsx";
import StaffLayout from "./layouts/StaffLayout.jsx";
import Landing from "../features/landing/Landing.jsx";
import Help from "../features/help/Help.jsx";
import NotFound from "../features/help/NotFound.jsx";
import Login from "../features/auth/Login.jsx";
import Register from "../features/auth/Register.jsx";
import Recover from "../features/auth/Recover.jsx";
import Reset from "../features/auth/Reset.jsx";
import Tickets from "../features/tickets/Tickets.jsx";
import Assistant from "../features/chat/Assistant.jsx";
import StaffLogin from "../features/auth/StaffLogin.jsx";
import Workshop from "../features/workshop/Workshop.jsx";
import TicketDetail from "../features/workshop/TicketDetail.jsx";
import NewTicket from "../features/workshop/NewTicket.jsx";
import Inventory from "../features/workshop/Inventory.jsx";
import PartForm from "../features/workshop/PartForm.jsx";

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route element={<AuthLayout />}>
          <Route path="/portal/acceso" element={<Login />} />
          <Route path="/portal/registro" element={<Register />} />
          <Route path="/portal/recuperar" element={<Recover />} />
          <Route path="/portal/restablecer" element={<Reset />} />
          <Route path="/taller/acceso" element={<StaffLogin />} />
          <Route path="/ayuda" element={<Help />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<RequireRole role="client"><PortalLayout /></RequireRole>}>
          <Route path="/portal" element={<Tickets />} />
          <Route path="/portal/tickets" element={<Tickets />} />
          <Route path="/portal/asistente" element={<Assistant />} />
        </Route>

        <Route element={<RequireRole role="staff"><StaffLayout /></RequireRole>}>
          <Route path="/taller" element={<Workshop />} />
          <Route path="/taller/tickets/nuevo" element={<NewTicket />} />
          <Route path="/taller/tickets/:id" element={<TicketDetail />} />
          <Route path="/taller/inventario" element={<Inventory />} />
          <Route path="/taller/inventario/nuevo" element={<PartForm />} />
          <Route path="/taller/inventario/:sku/editar" element={<PartForm />} />
        </Route>
      </Routes>
    </>
  );
}
