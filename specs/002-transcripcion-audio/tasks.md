---
description: "Tareas locales del frontend derivadas de la spec canónica del backend"
---

# Tasks: Transcripción de audio para el chat — Frontend

**Fuente de verdad**: [spec y contrato canónicos del backend](README.md). No editar requisitos duplicados en este archivo.

**Alcance local**: Botón de micrófono, captura, envío multipart y presentación de transcripción/errores en React. API cliente existente: `src/features/chat/chatApi.js`.

**Formato**: `- [ ] T### [P?] [US?] acción concreta con ruta`. IDs locales a este repositorio. Cada prueba debe escribirse antes de la implementación asociada.

## Phase 1: Setup

**Purpose**: Preparar APIs de navegador simuladas para probar captura de voz sin micrófono real.

- [ ] T001 Añadir mocks reutilizables de `MediaRecorder`, `getUserMedia`, blobs y liberación de pistas en `tests/setup.js`.

---

## Phase 2: User Story 1 — Consultar por voz (P1, MVP frontend)

**Goal**: Primer toque comienza grabación; segundo toque detiene y envía; la transcripción aparece como mensaje del cliente con la respuesta.

**Independent Test**: En Vitest, simular permiso de micrófono, audio finalizado y respuesta API; verificar una sola solicitud multipart, patrón/conversación actuales y transcripción visible.

### Tests primero

- [ ] T002 [P] [US1] Añadir pruebas de `sendAudioMessage` (FormData, cookie incluida, campos y boundary no fijado manualmente) en `tests/unit/chat-api-audio.test.js`.
- [ ] T003 [P] [US1] Añadir pruebas del hook de captura para inicio/detención, duración máxima de 120 s, MIME soportado, permiso denegado y cierre de pistas en `tests/unit/voice-recorder.test.js`.
- [ ] T004 [P] [US1] Añadir prueba de integración del botón, selección del patrón, envío único y render de transcripción + respuesta en `tests/integration/chat-audio.test.jsx`.

### Implementación

- [ ] T005 [P] [US1] Añadir `sendAudioMessage` en `src/features/chat/chatApi.js`; enviar `audio`, `duration_ms`, `pattern`, `conversation_id` y `request_id` como `FormData` con `credentials: "include"`, sin fijar `Content-Type`.
- [ ] T006 [P] [US1] Crear `src/features/chat/useVoiceRecorder.js` para solicitar permiso, seleccionar un MIME aceptado por Groq, grabar hasta 120 s, detener al segundo toque y limpiar tracks al completar/desmontar.
- [ ] T007 [US1] Integrar el botón accesible de micrófono y estados `idle/recording/submitting/error` en `src/features/chat/LiveChat.jsx`; añadir mensaje del cliente con la transcripción y estilos responsivos en `src/shared/styles/portal.css`.

**Checkpoint**: La consulta por voz funciona contra un cliente API falso sin romper el envío escrito.

---

## Phase 3: User Story 2 — Recuperarse de errores de audio (P2)

**Goal**: Informar errores de permiso, formato, cuota/proveedor y red; dejar el chat escrito disponible.

**Independent Test**: Simular los errores HTTP del contrato y permiso denegado; confirmar aviso recuperable, micrófono reactivado y envío de texto operativo.

### Tests primero

- [ ] T008 [P] [US2] Añadir pruebas de permiso denegado, límite excedido, 413/415/422/429/503/504, red caída y recuperación escrita en `tests/integration/chat-audio-errors.test.jsx`.

### Implementación

- [ ] T009 [US2] Mapear errores 413/415/422/429/503/504 y errores de red a mensajes seguros en `src/features/chat/chatApi.js`.
- [ ] T010 [US2] Mostrar error recuperable, liberar el micrófono, evitar doble envío y conservar habilitado el formulario escrito en `src/features/chat/LiveChat.jsx`.

**Checkpoint**: Un fallo de audio no bloquea la conversación escrita ni revela errores técnicos.

---

## Phase 4: User Story 3 — Consultar la transcripción en turnos siguientes (P3)

**Goal**: Conservar los mensajes en orden y continuar con la conversación y patrón seleccionados.

**Independent Test**: Enviar audio, luego texto; ambos mensajes deben aparecer una sola vez y el segundo envío debe usar el `conversation_id` devuelto y el mismo patrón.

### Tests primero

- [ ] T011 [P] [US3] Añadir prueba de historial tras voz + texto y reintento sin duplicados en `tests/integration/chat-audio-history.test.jsx`.

### Implementación

- [ ] T012 [US3] Mantener la transcripción como mensaje de usuario en orden cronológico y usar el `conversation_id` de la respuesta para turnos posteriores en `src/features/chat/LiveChat.jsx`.

**Checkpoint**: La voz y el texto permanecen en el mismo hilo visible.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T013 [P] Documentar el botón, estados, requisitos HTTPS y vínculo a la spec/OpenAPI canónicos en `features.md` y `docs.md`.
- [ ] T014 Ejecutar `npm test` y `npm run build` desde la raíz del frontend y validar manualmente el portal en 360, 390, 768 y 1024 px con permiso de micrófono concedido/denegado.

---

## Dependencies & Parallel Opportunities

- T001 precede las pruebas que simulan APIs del navegador.
- US1 precede US2; US3 depende del flujo funcional de US1.
- Ejecutar T002/T003/T004 en paralelo; luego T005/T006 en paralelo. T007 integra ambos.
- Ejecutar T008 antes de T009/T010; T011 antes de T012.
- T013 puede ejecutarse en paralelo con pruebas finales una vez acordado el contrato; T014 espera las historias entregadas.

## MVP

Completar T001–T007 y comprobar el flujo real contra `POST /api/chat/audio` del backend conforme al OpenAPI canónico. Requiere la tarea backend que expone el endpoint y permite `AUDIO_TRANSCRIPTION_ENABLED=true` en el entorno de prueba.
