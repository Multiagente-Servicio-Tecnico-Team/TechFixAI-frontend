# Inventory movements consumer contract

The backend OpenAPI remains canonical: `../../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/008-trazabilidad-movimientos-inventario/contracts/inventory-movements.openapi.yaml`. This file records only frontend consumption and error presentation; it does not redefine the API.

## Authentication and base URL

- Keep using the existing inventory API base URL resolution (`VITE_API_URL` in development, `/backend` same-origin proxy in production).
- Every request includes the existing session cookie using `credentials: "include"`.
- Backend authorizes ADMIN and TECHNICIAN. CUSTOMER receives 403.

## Operations consumed

| Action | Request | Successful result |
|---|---|---|
| Create catalog item | Existing `POST /api/inventory/parts`; new UI omits deprecated `current_stock` | `{ part }`; new item begins at `current_stock: 0`. |
| Edit catalog item | Existing `PUT /api/inventory/parts/{code}`; omit `current_stock` | `{ part }`; stock is unchanged. |
| Record opening | `POST /api/inventory/parts/{part_id}/opening-balance`; JSON `{ counted_stock, reason }`; `Idempotency-Key: <UUID>` | `201` when a movement is created; `200` for zero/no change or replay. JSON `{ part: { id, code, current_stock }, changed, movement }`. |
| Adjust to count | `POST /api/inventory/parts/{part_id}/adjustments`; JSON `{ counted_stock, reason }`; `Idempotency-Key: <UUID>` | `201` for a change; `200` for no change or replay; same response shape. |
| List history | `GET /api/inventory/parts/{part_id}/movements?movement_type=&from_date=&to_date=&limit=50&offset=0` | `{ items, total, limit, offset }`. Backend returns newest first; limit is 1–200. |
| Retire item | Existing `DELETE /api/inventory/parts/{code}` | `204`; UI removes it from active list and says “retirado del catálogo”. Backend may preserve it as inactive when history exists. |

`Idempotent-Replayed: true` is returned only when the server replays a prior committed operation. A no-op also returns 200 and does not carry that header. A zero opening does not need a call; article creation already leaves zero stock.

## Error handling

| HTTP/code | Frontend behavior |
|---|---|
| 401 `session_required` | Explain that the session ended; do not claim success. |
| 403 `staff_only` | Explain that inventory is for workshop staff. |
| 404 `not_found` | Explain that the item is no longer available; offer reload/back. |
| 409 `reserved_stock` | Keep old balance; explain active reservations prevent that count. |
| 409 `opening_exists` | Refresh the item; the opening may already have been recorded. |
| 409 `idempotency_conflict` | Do not silently retry with a new key; show a recoverable message and reload server state. |
| Other 409 | Use a clear generic inventory conflict; do not mislabel every conflict as duplicate SKU. |
| 422 `invalid` | Show backend field when present; retain entered values. |
| 503/network or malformed response | Generic recoverable service error; keep current data and do not substitute demo values in API mode. |

## Important response details

- Movement `reason`, `actor_name`, and source fields can be null; display them only when present.
- `is_before_cutover: true` marks legacy history before the system opening baseline.
- `source_type` can be `PURCHASE_RECEIPT`, `SALE`, `OPENING_BALANCE`, `ADJUSTMENT`, or null.
- Existing active inventory mapping already retains numeric `part.id`; movement paths must use that ID, not SKU.
- The history route can establish that an article is retired by comparing the ID with the active catalog response; for an inactive article, its snapshots in returned movements provide display labels. If the item has no movements and is absent from active catalog, the backend returns 404.
- The OpenAPI declares the `Idempotent-Replayed` header alongside 200 responses; runtime emits it only for actual replay, so the UI must use `changed` and presence of `movement` to distinguish no-op from replay.
