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
import InventoryMovements from "../features/workshop/InventoryMovements.jsx";
import PartForm from "../features/workshop/PartForm.jsx";
import AccountingList from "../features/accounting/AccountingList.jsx";
import AccountingCreate from "../features/accounting/AccountingCreate.jsx";
import AccountingDetail from "../features/accounting/AccountingDetail.jsx";
import AccountingPlans from "../features/accounting/plans/AccountingPlans.jsx";
import AccountingAccounts from "../features/accounting/plans/AccountingAccounts.jsx";
import AccountingPeriods from "../features/accounting/periods/AccountingPeriods.jsx";
import AccountingPeriodEvents from "../features/accounting/periods/AccountingPeriodEvents.jsx";
import AccountingJournal from "../features/accounting/reports/AccountingJournal.jsx";
import AccountingLedger from "../features/accounting/reports/AccountingLedger.jsx";
import AccountingTrialBalance from "../features/accounting/reports/AccountingTrialBalance.jsx";
import TicketAdminRoute from "../features/workshop/TicketAdminRoute.jsx";
import PurchasesList from "../features/purchases/PurchasesList.jsx";
import PurchaseCreate from "../features/purchases/PurchaseCreate.jsx";
import PurchaseDetail from "../features/purchases/PurchaseDetail.jsx";
import PurchaseOrdersList from "../features/purchases/PurchaseOrdersList.jsx";
import PurchaseOrderCreate from "../features/purchases/PurchaseOrderCreate.jsx";
import PurchaseOrderDetail from "../features/purchases/PurchaseOrderDetail.jsx";
import SupplierList from "../features/purchases/SupplierList.jsx";
import SupplierForm from "../features/purchases/SupplierForm.jsx";
import CustomerQuotes from "../features/commerce/CustomerQuotes.jsx";
import CustomerOrders from "../features/commerce/CustomerOrders.jsx";
import CustomerManager from "../features/customers/CustomerManager.jsx";
import AdminCommerce from "../features/commerce/AdminCommerce.jsx";
import AdminChat from "../features/chat/AdminChat.jsx";

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
          <Route path="/portal/cotizaciones" element={<CustomerQuotes />} />
          <Route path="/portal/compras" element={<CustomerOrders />} />
        </Route>

        <Route element={<RequireRole role="staff"><StaffLayout /></RequireRole>}>
          <Route element={<TicketAdminRoute />}>
            <Route path="/taller" element={<Workshop />} />
            <Route path="/taller/tickets/nuevo" element={<NewTicket />} />
            <Route path="/taller/tickets/:id" element={<TicketDetail />} />
          </Route>
          <Route path="/taller/inventario" element={<Inventory />} />
          <Route path="/taller/inventario/:partId/movimientos" element={<InventoryMovements />} />
          <Route path="/taller/inventario/nuevo" element={<PartForm />} />
          <Route path="/taller/inventario/:sku/editar" element={<PartForm />} />
          <Route element={<RequireRole role="staff" accountRole="ADMIN" deniedStateKey="adminChatDenied"><Outlet /></RequireRole>}>
            <Route path="/taller/asistente" element={<AdminChat />} />
          </Route>
          <Route element={<RequireRole role="staff" accountRole="ADMIN"><Outlet /></RequireRole>}>
            <Route path="/taller/contabilidad" element={<AccountingList />} />
            <Route path="/taller/contabilidad/nuevo" element={<AccountingCreate />} />
            <Route path="/taller/contabilidad/:id" element={<AccountingDetail />} />
            <Route path="/taller/contabilidad/planes" element={<AccountingPlans />} />
            <Route path="/taller/contabilidad/cuentas" element={<AccountingAccounts />} />
            <Route path="/taller/contabilidad/periodos" element={<AccountingPeriods />} />
            <Route path="/taller/contabilidad/periodos/:year/:month/eventos" element={<AccountingPeriodEvents />} />
            <Route path="/taller/contabilidad/informes/diario" element={<AccountingJournal />} />
            <Route path="/taller/contabilidad/informes/mayor" element={<AccountingLedger />} />
            <Route path="/taller/contabilidad/informes/balance" element={<AccountingTrialBalance />} />
          </Route>
          <Route element={<RequireRole role="staff" accountRole="ADMIN" deniedStateKey="purchasesDenied" deniedTo="/taller/inventario"><Outlet /></RequireRole>}>
            <Route path="/taller/compras" element={<PurchasesList />} />
            <Route path="/taller/compras/nuevo" element={<PurchaseCreate />} />
            <Route path="/taller/compras/ordenes" element={<PurchaseOrdersList />} />
            <Route path="/taller/compras/ordenes/nuevo" element={<PurchaseOrderCreate />} />
            <Route path="/taller/compras/ordenes/:id/editar" element={<PurchaseOrderCreate />} />
            <Route path="/taller/compras/ordenes/:id" element={<PurchaseOrderDetail />} />
            <Route path="/taller/compras/proveedores" element={<SupplierList />} />
            <Route path="/taller/compras/proveedores/nuevo" element={<SupplierForm />} />
            <Route path="/taller/compras/proveedores/:id/editar" element={<SupplierForm />} />
            <Route path="/taller/compras/:id" element={<PurchaseDetail />} />
          </Route>
          <Route element={<RequireRole role="staff" accountRole="ADMIN" deniedStateKey="commerceDenied" deniedTo="/taller/inventario"><Outlet /></RequireRole>}>
            <Route path="/taller/clientes" element={<CustomerManager />} />
            <Route path="/taller/ventas" element={<AdminCommerce />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
