// Datos de demostración del taller y del portal (valores de los diseños de Figma). Importes en céntimos.

export const staffTickets = [
  { id: "TCK-2041", date: "24/10/24", client: "Martín Gómez", phone: "+51 984 219 920", email: "martin.gomez@empresa.pe", device: "MacBook Pro 14\" M2 Max (2023)", issue: "Pantalla en negro y fallo de lectura en almacenamiento persistente tras actualización de sistema.", category: "Reparación", budget: 39500, status: "En Revisión Técnica", origin: "Bot", payment: "Pendiente de aprobación", advance: null, method: null },
  { id: "TCK-2040", date: "23/10/24", client: "Valeria Lozano", phone: "+51 916 310 844", email: "", device: "iPhone 15 Pro Max", issue: "Reemplazo Pantalla OLED + Lidar", category: "Reparación", budget: 31200, status: "Esperando Stock", origin: "Presencial", payment: "Pendiente", advance: null, method: null },
  { id: "TCK-2039", date: "22/10/24", client: "Diego Rossi", phone: "+51 915 092 133", email: "", device: "Armado PC Workstation Threadripper", issue: "Setup 128GB RAM + RTX 4090 24GB", category: "Venta", budget: 425000, status: "Presupuesto Aprobado", origin: "Bot", payment: "Aprobado", advance: null, method: null },
  { id: "TCK-2038", date: "21/10/24", client: "Camila Peralta", phone: "+51 913 289 775", email: "", device: "Dell XPS 15 9520", issue: "Limpieza térmica, repaste PTM7950 y BIOS", category: "Soporte", budget: 4800, status: "Listo para Retiro", origin: "Bot", payment: "Aprobado", advance: null, method: null },
  { id: "TCK-2037", date: "24/10/24", client: "Esteban Bauer", phone: "+51 991 244 802", email: "", device: "PlayStation 5 Slim", issue: "Lector óptico atascado / Error CE-108255-1", category: "Reparación", budget: 6500, status: "Nuevo", origin: "Presencial", payment: "Pendiente", advance: null, method: null },
  { id: "TCK-2036", date: "20/10/24", client: "Romina Navarro", phone: "+51 918 820 192", email: "", device: "iPad Air 5th Gen (M1)", issue: "Batería degradada + puerto Type-C", category: "Soporte", budget: 9200, status: "Entregado", origin: "Presencial", payment: "Pagado", advance: null, method: null },
];

export const clientTickets = [
  { id: "TCK-2052", when: "Ayer a las 17:40", kind: "Reparación", device: "Asus ROG Strix G15", icon: "laptop", summary: "Falla de ventilador GPU, ruido anormal y apagado térmico por precaución.", note: "Presupuesto emitido por Diagnóstico IA · Pendiente de visto bueno", status: "approval", lines: [], total: 16000 },
  { id: "TCK-2041", when: "24/10/24 · 10:15 AM", kind: "Reparación de hardware", device: "MacBook Pro 14\" M2 Max (2023)", icon: "monitor", summary: "Pantalla en negro y fallo de lectura en almacenamiento persistente tras actualización de sistema.", status: "approval", lines: [
    { label: "Mano de obra especializada (Triage & Microelectrónica)", amount: 4500 },
    { label: "SSD NVMe 1TB Samsung 980 (Repuesto Original OEM)", amount: 35000 },
  ], total: 39500 },
  { id: "TCK-1988", when: "18/10/24 · 14:02", kind: "Venta de repuesto", device: "Memoria RAM DDR4 16GB Kingston Fury Beast 3200MHz (2 unidades)", icon: "chip", summary: "Adquisición directa de componentes para retiro presencial inmediato.", pickup: "Retiro en Sede Central — Locker Inteligente #4", status: "ready", lines: [], total: 23000 },
  { id: "TCK-1850", when: "05/10/24 · Cerrado", kind: "Soporte técnico", device: "Lenovo ThinkPad T14", icon: "done", summary: "Mantenimiento térmico, limpieza interna ultrasónica y actualización de firmware BIOS completados satisfactoriamente.", status: "done", lines: [], total: 8000 },
];

export const parts = [
  { sku: "SSD-NVME-2TB-KC", name: "SSD NVMe M.2 2TB Kingston KC3000 PCIe 4.0", category: "Almacenamiento SSD / HDD", compat: "Laptops Dell XPS / ThinkPad T-Series / Gaming", stock: 34, min: 5, price: 11475, icon: "chip" },
  { sku: "LCD-156-FHD144-40P", name: "Display FHD 15.6\" IPS 144Hz 40-Pin eDP Slim", category: "Pantallas", compat: "Acer Nitro 5 / ASUS TUF Gaming / HP Omen", stock: 2, min: 5, price: 9800, icon: "monitor" },
  { sku: "BAT-APL-A2337", name: "Batería A2337 Original OEM 49.9Wh", category: "Baterías", compat: "Apple MacBook Air M1 (2020)", stock: 19, min: 5, price: 8010, icon: "battery" },
  { sku: "RAM-CRU-16G-D5", name: "RAM SODIMM Crucial 16GB DDR5 4800MHz CL40", category: "Memorias RAM", compat: "Laptops Lenovo Legion / Dell Latitude 5530", stock: 62, min: 10, price: 5200, icon: "ram" },
];
