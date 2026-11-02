# Sistema de diseño «Banco» · TechFix.AI

Propuesta de la Fase 2. Valores exactos en [`design-tokens.json`](design-tokens.json); componentes y estados en
[`design-preview.html`](design-preview.html).

**Idea:** cada reparación es una etiqueta de taller que avanza de estación en estación hasta volver a manos del cliente.

## Decisiones

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Logotipo | Etiqueta perforada con una T recortada | Es el objeto central del sistema y se reconoce a 16 px |
| Display | Bricolage Grotesque 800 | Carácter de rótulo de taller en títulos cortos |
| Texto | Atkinson Hyperlegible, 15 px de base | Diseñada para distinguir letras parecidas; ayuda con códigos y modelos |
| Datos | Martian Mono, mínimo 12 px | Alinea SKU, tickets e importes |
| Color de marca | Amarillo de seguridad solo en la franja, el logo y los estados de avance | Si aparece en todo, deja de señalar |
| Acción | Azul cobalto en claro, amarillo en oscuro | Una sola acción principal por vista |
| Forma | Esquina recortada y perforación solo para lo que representa un trabajo | La forma comunica qué es un ticket o un presupuesto |
| Bordes | 2 px en controles, 3 px en reglas de columna, radio de 2 px | Aspecto de herramienta; sin sombras salvo diálogos |
| Estado | Posición, texto e icono; el color nunca va solo | Accesible sin percepción de color |
| Movimiento | 120 a 180 ms al cambiar de estado; se respeta «reducir movimiento» | Orienta sin adornar |
| Iconos | `lucide-react` con su trazo por defecto, ya instalada, más los símbolos propios | No agrega dependencias |

## Patrones de la experiencia

1. **Mover, no navegar:** el estado de un ticket se cambia desde su etiqueta con «Mover a». No hay arrastre: evita una librería y cumple WCAG 2.5.7 sin alternativa adicional.
2. **Primero lo que necesita a alguien:** presupuestos por aprobar, stock crítico y tickets nuevos encabezan su pantalla.
3. **La etiqueta se ve crecer:** en el asistente y en el ticket presencial lo capturado aparece en la etiqueta a medida que se completa.
4. **Una franja, dos contextos:** escritorio con franja superior; celular con franja mínima y barra inferior de hasta 3 destinos.

## Mapa por pantalla

Las rutas no cambian.

| Pantalla | Navegación | Jerarquía nueva | Qué cambia respecto a hoy |
| --- | --- | --- | --- |
| Landing `/` | Franja con secciones y acceso | Título a la izquierda y tablero de muestra a la derecha; las secciones siguen el recorrido de una etiqueta | Deja el héroe centrado y el panel falso debajo; misma información |
| Acceso cliente y taller | Franja mínima | Formulario dentro de una etiqueta grande; el rótulo indica «Cliente» o «Taller» | Deja la tarjeta centrada con pie legal |
| Registro | Franja mínima | Etiqueta de dos columnas: datos a la izquierda, contraseña y requisitos a la derecha | Deja el formulario largo de una columna |
| Recuperar y restablecer | Franja mínima | Una tarea por etiqueta y el resultado con un sello | Mismos mensajes y reglas |
| Mis Tickets | Franja: Mis tickets, Asistente | «Necesita tu aprobación», luego «En curso» y «Entregados»; cada etiqueta muestra su avance | Deja la lista con filtros como primer elemento; búsqueda y filtros siguen disponibles |
| Asistente | Igual | Chat a la izquierda y etiqueta en preparación a la derecha; en celular, la etiqueta va antes del chat | El presupuesto deja de quedar enterrado en el hilo |
| Banco `/taller` | Franja: Banco, Repuestos, Nuevo ticket | Resumen, herramientas y tablero de seis estaciones | La tabla pasa a tablero; en celular, una estación por vista con selector |
| Detalle | Volver al banco | Etiqueta grande con carril de estaciones y datos del cliente, equipo y costo | Deja las tres tarjetas apiladas; el cambio de estado va en el carril |
| Ticket presencial | Volver al banco | Orden de ingreso a la izquierda y etiqueta en vivo a la derecha | Deja la cuadrícula de tarjetas y la barra inferior |
| Repuestos | Franja | Alertas críticas primero y estantes por categoría, con medidor de stock frente al mínimo | La lista plana pasa a estantes; búsqueda, orden y paginación se mantienen |
| Formulario de repuesto | Volver a repuestos | Ficha con vista previa de la etiqueta del repuesto | Misma ruta y validaciones |
| Ayuda | Franja mínima | Índice lateral y contenido | Deja las tarjetas apiladas |
| 404 | Franja mínima | Etiqueta «Sin estación» con salidas claras | Identidad nueva, misma función |

### Por qué cambian los tres patrones centrales

- **Cola a tablero:** el trabajo es un flujo, así que la posición muestra de inmediato dónde se acumula.
- **Inventario a estantes:** el técnico busca por tipo de pieza y necesita ver si queda poco; el medidor lo muestra sin comparar dos números.
- **Asistente con etiqueta:** el cliente siempre ve qué se está registrando y cuánto cuesta antes de confirmar.

### Mejoras esperadas

Son estimaciones de diseño, todavía sin medir con personas.

| Tarea | Hoy | Con Banco |
| --- | --- | --- |
| Saber qué estación está saturada | Filtrar estado por estado | Se ve en el tablero |
| Encontrar qué aprobar como cliente | Buscar en la lista | Primer bloque de la pantalla |
| Revisar el presupuesto mientras se conversa | Desplazarse por el chat | Siempre visible |
| Detectar stock crítico | Filtro o revisar filas | Primer bloque de Repuestos |

## Decisiones que necesitan aprobación

1. **Paginación de la cola:** en el tablero se reemplaza por «Mostrar más» dentro de cada estación. La función de ver todos los tickets se conserva, pero cambia su forma.
2. **Métricas de la cola:** «Tickets activos» y las demás pasan a una línea de resumen, además del contador de cada estación.
3. **Acceso y registro:** las pruebas buscan textos y etiquetas; esos textos se conservan.

## Funcionalidades que se conservan

| Pantalla | Debe seguir haciendo |
| --- | --- |
| Landing `/` | Enlaces al portal, al asistente y al panel; con sesión de cliente, «Ir a mi portal» en vez de «Iniciar sesión» |
| Registro | Nombre, correo, móvil de 9 dígitos, contraseña con requisitos en vivo, confirmación, términos; error de correo duplicado en su campo; entra al portal con sesión |
| Acceso cliente y taller | Validación, carga, «Correo o contraseña incorrectos», bloqueo por intentos, vuelve a la página protegida pedida; aviso si una cuenta de cliente entra al taller; nota de modo demostración |
| Recuperar y restablecer | Mismo mensaje exista o no la cuenta; nueva contraseña con la misma política; enlace inválido o vencido con opción de pedir otro |
| Mis Tickets | Lista desde la API o demostración, búsqueda, filtros por estado, presupuesto y su aprobación, lista vacía, error con reintento |
| Asistente | Selector de patrón bloqueado durante la conversación, nueva conversación, texto con negritas, presupuesto con «Confirmar y guardar» y «No guardar», ticket creado, «escribiendo», sesión vencida con vuelta, límite de mensajes, reintento |
| Cola | Métricas, búsqueda, filtros por tipo y estado, cambio de estado, origen, ver detalle, correo, paginación, exportar |
| Detalle | Datos del ticket y cambio de estado con aviso |
| Ticket presencial | Formulario de alta con validaciones |
| Inventario | Listar con búsqueda, categoría, stock crítico, orden y paginación; crear, editar y eliminar con confirmación; carga y error con reintento cuando hay API |
| Ayuda y 404 | Preguntas frecuentes, soporte, estado y legales; página no encontrada |
| Global | Rutas protegidas por rol, cerrar sesión, menú en celular, sin desplazamiento horizontal en 360, 390, 768, 1024 y 1366 px, tema claro y oscuro |
