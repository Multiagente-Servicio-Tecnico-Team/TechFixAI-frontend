# Plan de implementación frontend: transcripción de audio

**Branch**: `002-transcripcion-audio` | **Fecha**: 2026-11-02  
**Requisitos canónicos**: [spec backend](../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/002-transcripcion-audio/spec.md)  
**Contrato canónico**: [OpenAPI backend](../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/002-transcripcion-audio/contracts/audio-chat.openapi.yaml)

## Resumen

Agregar captura de voz al chat conectado de React. El primer toque solicita permiso e inicia `MediaRecorder`; el segundo detiene la grabación y envía un único `FormData` a `POST /api/chat/audio`. La respuesta muestra `transcript` como mensaje del usuario y `reply` como respuesta del agente dentro de la misma conversación y patrón. El envío escrito mantiene su flujo actual.

## Contexto técnico

- **Lenguaje/plataforma**: JavaScript ES modules, React 18, Vite 5, navegadores con `MediaRecorder` y `getUserMedia`.
- **Dependencias**: las existentes; `lucide-react`, Vitest, Testing Library y jsdom. No se agrega una dependencia de grabación.
- **Persistencia**: ninguna nueva en cliente; audio temporal en memoria como `Blob`, sin guardar archivos ni transcripciones localmente.
- **Pruebas**: Vitest; dobles de `MediaRecorder`, `navigator.mediaDevices`, tracks y `fetch`.
- **Integración**: `src/features/chat/chatApi.js`, `src/features/chat/LiveChat.jsx` y el contrato multipart del backend.
- **Privacidad**: cookie de sesión con `credentials: "include"`; no enviar identidad del cliente ni exponer detalles técnicos de errores.
- **Límites**: 120 s de grabación, 25.000.000 bytes y tipos de audio admitidos por el contrato; el navegador no define manualmente el header multipart `Content-Type`.
- **Accesibilidad**: botón con nombre accesible, estado anunciado, foco visible y chat escrito habilitado si falla la voz.

## Decisiones de diseño

1. Mantener el cliente HTTP de chat como único lugar de llamadas al backend. `sendAudioMessage` construye `FormData` con audio, duración, patrón, conversación y UUID de idempotencia.
2. Encapsular permisos, elección de MIME, inicio/parada, temporizador y liberación de pistas en `useVoiceRecorder.js`; el componente de pantalla solo coordina estado y conversación.
3. Manejar estados `idle`, `recording` y `submitting`, además del error recuperable. Mientras se envía no se acepta otro audio ni otro turno escrito; al fallar, el formulario escrito vuelve a estar disponible.
4. Añadir el mensaje del usuario solo cuando la respuesta contiene una transcripción válida y una respuesta asociada. Los reintentos usan el mismo payload y el mismo `request_id` para conservar idempotencia.
5. Reutilizar tokens, clases y breakpoints existentes del portal; estilos específicos del compositor van en `src/shared/styles/portal.css`.

## Estructura afectada

```text
src/features/chat/
├── chatApi.js
├── useVoiceRecorder.js
└── LiveChat.jsx
src/shared/styles/portal.css
tests/
├── setup.js
├── unit/chat-api-audio.test.js
├── unit/voice-recorder.test.js
└── integration/chat-audio*.test.jsx
features.md
docs.md
```

## Criterios de cierre

- Mantener pasando el flujo escrito y la suite existente.
- Verificar captura, límites, permiso denegado, MIME no soportado, errores HTTP y recuperación escrita con pruebas simuladas.
- Ejecutar `npm test` y `npm run build`; revisar diseño responsive en los anchos del task list cuando el navegador de prueba esté disponible.
