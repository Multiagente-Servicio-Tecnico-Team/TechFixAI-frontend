const QUOTE_STATUS_LABEL = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};

const PAYMENT_STATUS_LABEL = {
  PENDING: "Pendiente",
  COMPLETED: "Pagado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
  PARTIALLY_REFUNDED: "Reembolso parcial",
};

const ORDER_STATUS_LABEL = {
  PAID: "Pagada",
  PREPARING: "En preparación",
  FULFILLED: "Entregada",
  CANCELLED: "Cancelada",
};

const PAYMENT_METHOD_LABEL = {
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  BANK_TRANSFER: "Transferencia bancaria",
  CASH: "Efectivo",
  PAYMENT_GATEWAY: "Pasarela de pago",
  YAPE_PLIN: "Yape / Plin",
};

export const CUSTOMER_ORIGIN_LABEL = { MANUAL: "Presencial", PORTAL: "Portal" };
export const QUOTE_KIND_LABEL = { REPAIR: "Servicio técnico", DIRECT_SALE: "Venta de productos", PC_BUILD: "Armado de PC" };
export const SERVICE_REQUEST_LABEL = {
  REPAIR: "Reparación",
  SUPPORT: "Soporte técnico",
  PC_BUILD: "Armado de PC",
  WARRANTY_CLAIM: "Reclamo de garantía",
};

function positiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function normalizeCustomer(dto = {}) {
  return {
    ...dto,
    id: positiveId(dto.id),
    name: dto.display_name ?? dto.name ?? "Cliente sin nombre",
    phone: dto.phone ?? "",
    email: dto.email ?? "",
    originLabel: CUSTOMER_ORIGIN_LABEL[dto.origin] ?? "Origen no disponible",
    accountLinked: dto.account_linked === true,
    active: dto.active !== false,
  };
}

export function normalizeCommercialQuote(dto = {}) {
  const kind = dto.kind ?? dto.quote_type ?? "UNKNOWN";
  const status = dto.status ?? "UNKNOWN";
  const paymentStatus = dto.payment_status ?? null;
  return {
    ...dto,
    id: positiveId(dto.id),
    customerId: positiveId(dto.customer_id),
    ticketId: positiveId(dto.ticket_id),
    kind,
    kindLabel: QUOTE_KIND_LABEL[kind] ?? "Cotización",
    status,
    statusLabel: QUOTE_STATUS_LABEL[status] ?? "Estado no disponible",
    totalAmount: dto.total_amount ?? null,
    paymentStatus,
    paymentStatusLabel: paymentStatus ? (PAYMENT_STATUS_LABEL[paymentStatus] ?? "Estado no disponible") : null,
    reservationStatus: dto.inventory_reservation_status ?? null,
    lines: Array.isArray(dto.lines) ? dto.lines.map((line) => ({
      ...line,
      sparePartId: positiveId(line.spare_part_id),
      name: line.name_snapshot ?? line.name ?? "Artículo",
      quantity: Number(line.quantity) || 0,
      unitPrice: line.unit_price ?? null,
      subtotal: line.subtotal ?? null,
    })) : [],
  };
}

export function normalizeCommercialTicket(dto = {}) {
  const rawQuotes = Array.isArray(dto.quotes)
    ? dto.quotes
    : dto.quote ? [dto.quote] : [];
  return {
    ...dto,
    id: positiveId(dto.id),
    customerId: positiveId(dto.customer_id),
    title: dto.title ?? "Equipo no especificado",
    requestType: dto.request_type ?? "UNKNOWN",
    requestTypeLabel: SERVICE_REQUEST_LABEL[dto.request_type] ?? "Tipo no disponible",
    status: dto.status ?? "UNKNOWN",
    quotes: rawQuotes.map(normalizeCommercialQuote),
  };
}

export function normalizePayment(dto = {}) {
  const status = dto.status ?? "UNKNOWN";
  return {
    ...dto,
    id: positiveId(dto.id),
    quoteId: positiveId(dto.quote_id),
    amount: dto.amount ?? null,
    paymentMethod: dto.payment_method ?? null,
    paymentMethodLabel: dto.payment_method ? PAYMENT_METHOD_LABEL[dto.payment_method] ?? "Método no disponible" : null,
    status,
    statusLabel: PAYMENT_STATUS_LABEL[status] ?? "Estado no disponible",
  };
}

export function normalizeSalesOrder(dto = {}) {
  const status = dto.status ?? "UNKNOWN";
  return {
    ...dto,
    id: positiveId(dto.id),
    quoteId: positiveId(dto.quote_id),
    paymentId: positiveId(dto.payment_id),
    totalAmount: dto.total_amount ?? null,
    status,
    statusLabel: ORDER_STATUS_LABEL[status] ?? "Estado no disponible",
    lines: Array.isArray(dto.lines) ? dto.lines : [],
  };
}

export const commerceLabels = {
  quoteStatus: QUOTE_STATUS_LABEL,
  paymentStatus: PAYMENT_STATUS_LABEL,
  orderStatus: ORDER_STATUS_LABEL,
  paymentMethod: PAYMENT_METHOD_LABEL,
};
