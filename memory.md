# Memoria del frontend

Historial de decisiones y limitaciones reales, una línea por tarea cerrada (la más reciente al final).
Antes de programar, lee también `AGENTS.md`, `features.md` y `docs.md`.

Cómo registrar una tarea: agrega al final una línea `- Tema (AAAA-MM-DD): qué se hizo, cómo se validó y qué
limitación queda`, sin datos personales, claves ni textos de excepciones.

- Landing y cuentas (2026-10-05): landing de TechFix.AI en React y pantallas de registro, acceso, recuperación y restablecimiento siguiendo los prototipos de Figma; contraseña con requisitos en vivo; modo demostración sin `VITE_API_URL`.
- Portal y panel del taller (2026-10-05): portal del cliente (tickets y asistente) y panel del taller con datos de demostración en memoria; protección de rutas por rol con `sessionStorage` (solo rol, nombre y correo).
- Chat con los patrones (2026-10-07): el asistente envía `POST /api/chat` con la cookie de sesión y el patrón elegido (Jerárquico, Orquestador o Red descentralizada); el patrón queda fijo por conversación; si la sesión vence, lleva al acceso y vuelve al chat.
- Mismo origen en producción (2026-10-07): login y chat usan siempre `/backend/*` en producción para que la cookie HttpOnly sea del mismo sitio; `public/_redirects` reenvía a Render en Netlify.
- Mis Tickets (2026-10-13): la vista carga los tickets del cliente desde `/api/customer/tickets` (solo lectura). Limitación: `consultation.test.jsx` falla desde este cambio.
- Código en inglés (2026-10-13): nombres e identificadores en inglés; comentarios en español; textos de la interfaz en español.
- Estilos generales (2026-10-13): `src/styles/` con tokens, base y componentes compartidos; `styles.css` queda para la landing y `app.css` para el portal y el taller.
- Repositorio propio (2026-10-20): el frontend se separó del monorepositorio con su historial (sin archivos `.env`); producción en Vercel (`techfixai.vercel.app`). Limitaciones: Vercel debe apuntar a este repositorio y el proxy `/backend/*` no está en un `vercel.json`; el arreglo de la negrita del chat (PR #30 del repositorio anterior) aún no se trae.
- Clean Architecture (2026-10-21): capas `domain` (dinero, validaciones, tickets, cuenta), `shared` (UI sin estado, estilos, URL de la API), `state` (store, datos de demostración, sesión), `features` (auth, chat, tickets, workshop, landing, help) y `app` (rutas y layouts); prueba de dependencias entre capas y unitarias de dominio. Se trae la negrita del chat (`RichText`). Vitest: 72 aprobadas y 1 falla previa (`consultation.test.jsx`). Limitación: el taller sigue con datos de demostración.
- Limpieza (2026-10-21): piezas comunes de los dos chats en `ChatParts.jsx` (título, encabezado, mensaje del usuario, «escribiendo», hora); «Mis Tickets» vuelve a mostrar los tickets del modo demostración (incluidas las consultas del chat) y «Presupuesto: Por cotizar». Vitest: 73 aprobadas, sin fallas. Sin exportaciones ni archivos sin uso.
