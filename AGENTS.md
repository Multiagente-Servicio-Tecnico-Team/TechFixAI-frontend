# Instrucciones del proyecto

Frontend de TechFix.AI (React 18 + Vite 5 + React Router 6). La API está en
[TechFixAI-backend](https://github.com/Multiagente-Servicio-Tecnico-Team/TechFixAI-backend).

## Antes de escribir código

1. Lee `memory.md` (decisiones y limitaciones), `features.md` (pantallas, estado y responsables) y `docs.md` (índice).
2. Revisa el trabajo en curso para no duplicarlo: `git fetch --all`, `gh pr list` y las ramas abiertas.
3. Busca si ya existe un componente, estilo o cliente de API antes de crear otro (`git grep`). Reutiliza y extiende.
4. Si el cambio toca pantallas o archivos de otro integrante (`features.md`), avisa antes o hazlo en un PR aparte.

## Dónde va cada cosa

- Pantallas: `src/pages/` (`portal/` cliente, `staff/` taller). Rutas y protección por rol: `src/App.jsx`.
- Piezas comunes: `src/components/` (`ui.jsx`, `PasswordFields.jsx`…). No dupliques un botón, campo o aviso: usa los existentes.
- Estilos: lo que usan varias pantallas va en `src/styles/components.css`; los colores, radios y sombras salen de `src/styles/tokens.css` con `var(--…)`. Lo propio de la landing va en `src/styles.css` y lo del portal y el taller en `src/app.css`.
- Llamadas al backend: solo desde `src/api/auth.js` (cuentas) y `src/api/chat.js` (chat y tickets). Siempre con `credentials: "include"`; la sesión vive en una cookie HttpOnly que el frontend no lee.
- Contrato con el backend: `POST /api/chat` y `/auth/*` están documentados en el backend (`app/chat/README.md`, `app/accounts/README.md`). Si cambias lo que envías o esperas, coordínalo con el backend.

## Reglas

- Código e identificadores en inglés; comentarios pueden estar en español; textos de la interfaz en español.
- Nunca guardar contraseñas ni tokens en el navegador; `sessionStorage` solo guarda rol, nombre y correo.
- Mostrar el texto del backend solo cuando es un mensaje pensado para el usuario; ante errores de red o 5xx, mensajes genéricos.
- Accesibilidad: etiquetas en los campos, foco visible y navegación con teclado (lo cubren las pruebas).
- Responsivo: probar en 360, 390, 768 y 1024 px de ancho sin desplazamiento horizontal.
- Commits convencionales (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`) en español, sin mencionar herramientas ni agentes.
- Trabajo en ramas y PR hacia `develop`; nada directo a `main` ni a `develop`.
- Nunca subir `.env` ni archivos de entorno (el `.gitignore` ignora `.env*`).
- Pruebas: `npm test` (Vitest + Testing Library) y `npm run build` antes de abrir un PR.
