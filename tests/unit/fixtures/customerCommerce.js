export const customerDto = {
  id: 31,
  display_name: "Ana Torres",
  phone: "+51987654321",
  email: "ana@example.pe",
  origin: "MANUAL",
  account_linked: false,
  active: true,
};

export const quoteDto = {
  id: 71,
  kind: "DIRECT_SALE",
  ticket_id: null,
  status: "ACCEPTED",
  total_amount: "150.00",
  payment_status: "PENDING",
  inventory_reservation_status: "RESERVED",
  expires_at: "2027-01-01T00:00:00Z",
  lines: [{ spare_part_id: 4, name_snapshot: "Memoria DDR4", quantity: 1, unit_price: "150.00", subtotal: "150.00" }],
};

export const ticketDto = {
  id: 15,
  code: "TCK-0015",
  title: "Laptop Lenovo",
  request_type: "REPAIR",
  status: "QUOTED",
  quotes: [{ ...quoteDto, id: 72, kind: "REPAIR", ticket_id: 15 }],
};

export const paymentDto = { id: 80, quote_id: 71, status: "PENDING", amount: "150.00", payment_method: null };

export const orderDto = {
  id: 90,
  quote_id: 71,
  payment_id: 80,
  status: "PAID",
  total_amount: "150.00",
  lines: quoteDto.lines,
};
