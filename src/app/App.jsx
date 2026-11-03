import { Outlet, Route, Routes } from "react-router-dom";
import { RequireRole } from "../features/auth/RequireRole.jsx";
import { ScrollManager } from "./ScrollManager.jsx";
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
import AccountingList from "../features/accounting/AccountingList.jsx";
import AccountingCreate from "../features/accounting/AccountingCreate.jsx";
import AccountingDetail from "../features/accounting/AccountingDetail.jsx";
import TicketAdminRoute from "../features/workshop/TicketAdminRoute.jsx";
import PurchasesList from "../features/purchases/PurchasesList.jsx";
import PurchaseCreate from "../features/purchases/PurchaseCreate.jsx";
import PurchaseDetail from "../features/purchases/PurchaseDetail.jsx";
import SupplierManager from "../features/purchases/SupplierManager.jsx";

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
          <Route element={<TicketAdminRoute />}>
            <Route path="/taller" element={<Workshop />} />
            <Route path="/taller/tickets/nuevo" element={<NewTicket />} />
            <Route path="/taller/tickets/:id" element={<TicketDetail />} />
          </Route>
          <Route path="/taller/inventario" element={<Inventory />} />
          <Route path="/taller/inventario/nuevo" element={<PartForm />} />
          <Route path="/taller/inventario/:sku/editar" element={<PartForm />} />
          <Route element={<RequireRole role="staff" accountRole="ADMIN"><Outlet /></RequireRole>}>
            <Route path="/taller/contabilidad" element={<AccountingList />} />
            <Route path="/taller/contabilidad/nuevo" element={<AccountingCreate />} />
            <Route path="/taller/contabilidad/:id" element={<AccountingDetail />} />
          </Route>
          <Route element={<RequireRole role="staff" accountRole="ADMIN" deniedStateKey="purchasesDenied" deniedTo="/taller/inventario"><Outlet /></RequireRole>}>
            <Route path="/taller/compras" element={<PurchasesList />} />
            <Route path="/taller/compras/nuevo" element={<PurchaseCreate />} />
            <Route path="/taller/compras/proveedores" element={<SupplierManager />} />
            <Route path="/taller/compras/:id" element={<PurchaseDetail />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
