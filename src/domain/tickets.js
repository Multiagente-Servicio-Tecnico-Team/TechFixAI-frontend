// Estados y categorías de ticket. Los códigos (NEW, QUOTED…) son los del esquema de la base de datos.

export const STAFF_STATUSES = [
  "Nuevo",
  "En Revisión Técnica",
  "Esperando Stock",
  "Presupuesto Aprobado",
  "Listo para Retiro",
  "Entregado",
];

export const TICKET_CATEGORIES = ["Reparación", "Venta", "Soporte"];

/** Estados de ticket del script de BD -> texto para el cliente. */
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
