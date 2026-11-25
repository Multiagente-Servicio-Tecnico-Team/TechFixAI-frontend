// Códigos de tickets del backend y sus etiquetas visibles en español.

export const STAFF_STATUSES = [
  "Nuevo",
  "En Revisión Técnica",
  "Esperando Stock",
  "Presupuesto Aprobado",
  "Listo para Retiro",
  "Entregado",
];

export const TICKET_CATEGORIES = ["Reparación", "Venta", "Soporte"];

export const REQUEST_TYPE_LABEL = {
  REPAIR: "Reparación",
  SALE: "Venta",
  PC_BUILD: "Armado de PC",
  SUPPORT: "Soporte",
  WARRANTY_CLAIM: "Reclamo de garantía",
};
export const REQUEST_TYPE_CODES = Object.keys(REQUEST_TYPE_LABEL);
export const ADVANCE_PAYMENT_METHOD_LABEL = { YAPE_PLIN: "Yape/Plin", CASH: "Efectivo", CARD: "Tarjeta" };
export const TICKET_ORIGIN_LABEL = { MANUAL: "Presencial", ONLINE: "En línea", UNKNOWN: "Desconocido" };
export const QUOTE_STATUS_LABEL = { PENDING: "Pendiente", ACCEPTED: "Aceptada", REJECTED: "Rechazada", EXPIRED: "Vencida" };

/** Etiquetas históricas usadas por el portal cliente. */
export const TICKET_STATUS_LABEL = {
  NEW: "Recibido",
  IN_DIAGNOSIS: "En diagnóstico",
  QUOTED: "Presupuesto enviado",
  PAYMENT_PENDING: "Pago pendiente",
  IN_REPAIR: "En reparación",
  READY_FOR_PICKUP: "Listo para retiro",
  READY_FOR_DELIVERY: "Listo para despacho",
  WARRANTY_IN_REVIEW: "Garantía en revisión",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

/** Estados canónicos del panel administrativo de tickets. */
export const ADMIN_TICKET_STATUS_LABEL = {
  NEW: "Nuevo",
  IN_DIAGNOSIS: "En diagnóstico",
  QUOTED: "Presupuesto enviado",
  PAYMENT_PENDING: "Pago pendiente",
  PAID: "Pagado",
  IN_REPAIR: "En reparación",
  READY_FOR_DELIVERY: "Listo para despacho",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  WARRANTY_IN_REVIEW: "Garantía en revisión",
};
export const TICKET_STATUS_CODES = Object.keys(ADMIN_TICKET_STATUS_LABEL);
