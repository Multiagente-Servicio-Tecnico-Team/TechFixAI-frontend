# Instrucciones del proyecto

Frontend de TechFix.AI (React 18 + Vite 5 + React Router 6). La API está en
[TechFixAI-backend](https://github.com/Multiagente-Servicio-Tecnico-Team/TechFixAI-backend).

## Antes de escribir código

1. Lee `memory.md` (decisiones y limitaciones), `features.md` (pantallas, estado y responsables) y `docs.md` (índice).
2. Revisa el trabajo en curso para no duplicarlo: `git fetch --all`, `gh pr list` y las ramas abiertas.
3. Busca si ya existe un componente, estilo o cliente de API antes de crear otro (`git grep`). Reutiliza y extiende.
4. El responsable del frontend es SebasBazauri: los cambios se proponen con un PR hacia `develop` y él los revisa. Si el cambio depende del backend (contrato de la API), coordínalo también con su responsable.

## Dónde va cada cosa

- Capas: `domain` ← `shared` ← `state` ← `features` ← `app`; cada capa solo importa de las anteriores (lo verifica `tests/unit/architecture.test.js`).
- Reglas de negocio (importes en céntimos, validaciones, estados de ticket, datos de la cuenta): `src/domain/`, sin React; se prueban en `tests/unit/`.
- Pantallas: `src/features/<funcionalidad>/` (`auth`, `chat`, `tickets`, `workshop`, `landing`, `help`). Rutas y layouts: `src/app/`.
- Piezas comunes sin estado: `src/shared/ui/` (`ui.jsx`, `FormAlert`, `RichText`, `Logo`…). No dupliques un botón, campo o aviso: usa los existentes.
- Estado de React y datos de demostración: `src/state/`.
- Estilos: lo que usan varias pantallas va en `src/shared/styles/components.css`; los colores, radios y sombras salen de `src/shared/styles/tokens.css` con `var(--…)`. Lo propio de la landing va en `src/features/landing/landing.css`; la estructura común en `shell.css` y cada área en `auth.css`, `portal.css` y `workshop.css` de `src/shared/styles/`.
- Llamadas al backend: solo desde `src/features/auth/authApi.js` (cuentas) y `src/features/chat/chatApi.js` (chat y tickets). Siempre con `credentials: "include"`; la sesión vive en una cookie HttpOnly que el frontend no lee.
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
