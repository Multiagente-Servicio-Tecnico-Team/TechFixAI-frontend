# Sistema de diseño «Circuito» · TechFix.AI

Propuesta de la fase 1 del rediseño. Reemplaza por completo los estilos actuales; **no cambia ninguna
funcionalidad**. Vista previa interactiva: [`design-preview.html`](design-preview.html) (ábrela en el navegador;
el botón de arriba a la derecha alterna tema oscuro y claro). Valores exactos: [`design-tokens.json`](design-tokens.json).

## Dirección

Tema **técnico oscuro** por defecto, con **tema claro** opcional. La referencia son las herramientas de trabajo
técnicas (consolas de despliegue, gestores de incidencias, lanzadores de comandos): mucha información, jerarquía
clara, poco adorno. Encaja con un panel de taller que se usa todo el día y con un portal donde el cliente sigue
el estado de su equipo.

## Decisiones

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Color de marca | **Verde señal** `#2EE6C5` en oscuro (`#0B7F6C` en claro) | Reemplaza al azul anterior. Distinto de los colores de estado, se lee como «sistema activo» y contrasta 12.2:1 sobre el fondo oscuro |
| Un solo acento | El verde marca solo la acción principal, la selección y el foco | Si todo es acento, nada lo es; la acción principal de cada pantalla queda clara |
| Estados | Azul información, verde éxito, ámbar advertencia, rojo peligro, siempre con fondo al 12 % | El color de estado comunica significado (stock crítico, ticket listo) y nunca decora |
| Profundidad | 3 niveles de superficie (`surface-1..3`) y bordes de 1 px; sombras solo en diálogos y avisos | En oscuro las sombras casi no se ven; las superficies escalonadas ordenan sin ruido |
| Tipografía | **Geist** para la interfaz y **Geist Mono** para datos | La monoespaciada con cifras tabulares alinea SKU, importes, stock, códigos de ticket y horas |
| Escala | 12 · 13 · 14 · 16 · 18 · 22 · 28 · 36 · 48 px; cuerpo de 14 px | Densa para tablas, sin bajar de 12 px (corrige las etiquetas de 11 px actuales) |
| Espaciado | Escala de 4 px (4 a 64) | Ritmo constante entre pantallas |
| Radios | 4 etiquetas · 6 controles · 8 menús y avisos · 12 tarjetas y diálogos | Esquinas sobrias; nada de píldoras salvo etiquetas de estado |
| Controles | Alto de 36 px (44 px en acciones principales); área táctil mínima de 40 px | Corrige los enlaces del pie con menos de 32 px que detectó la revisión responsiva |
| Movimiento | 120 ms estados, 180 ms paneles, 260 ms diálogos; curva `cubic-bezier(0.2, 0, 0, 1)`; se respeta «reducir movimiento» | Respuesta inmediata sin animaciones decorativas |
| Foco | Contorno de 2 px en el color de foco con separación de 2 px | Visible en ambos temas y en cualquier fondo |

### Contraste (calculado en la vista previa)

Todos los colores de texto y de estado cumplen **AA (≥ 4.5:1)** contra el fondo en los dos temas.

| Color | Oscuro | Claro |
| --- | --- | --- |
| `text` / `text-2` / `text-3` | 16.4 · 8.7 · 5.6 | 17.2 · 7.4 · 5.1 |
| `accent` | 12.2 | 4.6 |
| `on-accent` sobre acento | 10.8 | 4.9 |
| `info` / `success` / `warning` / `danger` | 7.9 · 11.0 · 10.9 · ≥ 6 | 4.6 · 4.6 · 4.7 · ≥ 4.5 |

## Componentes

Botón (principal, secundario, fantasma, peligro, peligro fantasma; tamaños 30/36/44 px), botón de ícono, campo
con ícono o sufijo, selector, casilla, etiqueta de estado, aviso (información, éxito, error), métrica, pestañas con
contador, tabla densa (en celular pasa a tarjetas), paginación, esqueleto de carga, diálogo de confirmación,
aviso flotante, barra lateral de navegación, barra superior con migas y búsqueda, burbuja de chat, tarjeta de
presupuesto, línea de seguimiento del ticket.

## Disposición por área

| Área | Estructura |
| --- | --- |
| Landing | Navegación superior, hero con la propuesta y un vistazo real del panel, secciones de agentes, flujo, métricas, seguridad y llamada a la acción |
| Acceso, registro, recuperación | Dos columnas: mensaje de marca a la izquierda y formulario a la derecha; en celular solo el formulario |
| Portal del cliente | Barra superior con «Mis tickets» y «Asistente»; el asistente tiene una columna lateral con el ticket y su seguimiento |
| Panel del taller | Barra lateral (cola, ticket presencial, inventario), barra superior con migas, métricas, filtros y tabla |
| Ayuda y 404 | Página de contenido con el mismo encabezado de la landing |

## Funcionalidades que se conservan (fase 2)

El rediseño cambia la presentación y mantiene el comportamiento, los textos que validan las pruebas, los
nombres accesibles (`aria-label`) y las rutas.

| Pantalla | Debe seguir haciendo |
| --- | --- |
| Landing `/` | Enlaces al portal, al asistente y al panel; con sesión de cliente, «Ir a mi portal» en vez de «Iniciar sesión» |
| Registro `/portal/registro` | Nombre, correo, móvil de 9 dígitos, contraseña con requisitos en vivo, confirmación, términos; error de correo duplicado en su campo; entra al portal con sesión |
| Acceso `/portal/acceso` y `/taller/acceso` | Validación, carga, «Correo o contraseña incorrectos», bloqueo por intentos, vuelve a la página protegida pedida; aviso si una cuenta de cliente entra al taller; nota de modo demostración |
| Recuperar y restablecer | Mismo mensaje exista o no la cuenta; nueva contraseña con la misma política; enlace inválido o vencido con opción de pedir otro |
| Mis Tickets `/portal/tickets` | Lista desde la API (o demostración), búsqueda, filtros por estado, presupuesto y su aprobación, lista vacía, error con reintento |
| Asistente `/portal/asistente` | Selector de patrón bloqueado durante la conversación, nueva conversación, texto del agente con negritas, presupuesto con «Confirmar y guardar» y «No guardar», ticket creado, «escribiendo», sesión vencida → acceso y vuelta, límite de mensajes, reintento |
| Cola del taller `/taller` | Métricas, búsqueda, filtros por tipo y estado, cambio de estado por fila, origen, acciones, paginación, exportar |
| Detalle `/taller/tickets/:id` | Datos del ticket y cambio de estado con aviso |
| Ticket presencial `/taller/tickets/nuevo` | Formulario de alta con validaciones |
| Inventario `/taller/inventario` | Listar con búsqueda, categoría, stock crítico, orden y paginación; crear, editar y eliminar con confirmación; carga y error con reintento cuando hay API |
| Ayuda `/ayuda` y 404 | Preguntas frecuentes, soporte, estado y legales; página no encontrada |
| Global | Rutas protegidas por rol, cerrar sesión desde el menú de usuario, menú plegable en celular, sin desplazamiento horizontal en 360/390/768/1024 px |

## Plan de la fase 2

1. `src/shared/styles/tokens.css` pasa a los tokens de este documento (tema oscuro en `:root` y claro con `[data-theme="light"]`), con selector de tema guardado solo como preferencia visual.
2. `components.css` se reescribe con los componentes de arriba; `screens.css` y `landing.css` con las disposiciones por área.
3. Layouts (`AuthLayout`, `PortalLayout`, `StaffLayout`) y pantallas se adaptan a la nueva estructura sin tocar dominio, estado ni clientes de API.
4. Verificación: `npm test` y `npm run build`, revisión responsiva en 360/390/768/1024 px y capturas antes/después en ambos temas.
