# API reference

Base path `/api/v1`. Interactive docs (Swagger) are generated from the DTOs at
**`/docs`** on the running API. Every response error uses one envelope:

```json
{ "error": { "code": "QUOTE_STALE", "message": "…", "details": {} }, "requestId": "…" }
```

List endpoints accept `page`, `pageSize`, filters, and wrap results as
`{ "data": [...], "meta": { "page", "pageSize", "total" } }`.

## Auth flow

- `POST /auth/register` → creates a CUSTOMER, sets httpOnly cookies, returns the
  user. Agents and admins are created by an admin (no self-service privilege).
- `POST /auth/login` → sets `access_token` (15 min) and `refresh_token` (7 days)
  httpOnly cookies, signed with **separate** secrets. The body also returns the
  tokens for non-browser clients (Swagger "Authorize" with a Bearer token).
- `POST /auth/refresh` → exchanges the refresh cookie for a new pair.
- `POST /auth/logout` → clears the cookies.
- `GET /auth/me` → the authenticated user.

Guards run globally: `JwtAuthGuard` (skipped on `@Public()` routes), then
`RolesGuard` (`@Roles(...)`), then rate limiting.

## Endpoints

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/quotes` | customer/admin | Price a shipment, return an expiring quote |
| POST | `/orders` | customer/admin | Create an order from a quote (`409 QUOTE_STALE` if price moved) |
| GET | `/orders` | any | Role-scoped list; filters `status,zoneId,agentId,q,from,to` |
| GET | `/orders/:id` | owner/agent/admin | Detail incl. frozen `pricingSnapshot` and assignment logs |
| GET | `/orders/:id/tracking` | owner/agent/admin | Full append-only timeline |
| GET | `/orders/:id/tracking/verify` | owner/agent/admin | Hash-chain integrity `{ valid, eventsVerified }` |
| POST | `/orders/:id/assign` | admin | `{ agentId }` or `{ strategy: "AUTO" }` |
| POST | `/orders/:id/status` | agent/admin | Advance status; admin override needs `reason` |
| POST | `/orders/:id/reschedule` | customer/admin | Reschedule a failed delivery; auto-reassigns |
| GET | `/track/:orderNumber` | **public** | No-auth customer tracking |
| GET | `/agents/me/orders` | agent | The agent's active queue |
| PATCH | `/agents/me/availability` · `/agents/me/location` | agent | Self-service |
| GET/POST/PATCH | `/admin/zones` · `/admin/areas` | admin | Zone & area management |
| GET/POST | `/admin/rate-cards` · `/admin/surcharges` | admin | Pricing config |
| POST | `/admin/rate-cards/simulate` | admin | Dry-run pricing against active cards |
| PATCH | `/admin/pricing-config` | admin | Supersede pricing config (effective-dated) |
| GET | `/admin/dashboard/metrics` · `/admin/agents` | admin | Dashboard data |
| GET | `/admin/notifications` · `/admin/audit-logs` | admin | Observability |
| GET | `/health` · `/health/ready` | public | Liveness / readiness |

## Notable error codes

`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `QUOTE_STALE`, `QUOTE_EXPIRED`,
`RATE_CARD_NOT_FOUND`, `ZONE_UNRESOLVED`, `INVALID_TRANSITION`,
`ROLE_NOT_PERMITTED`, `ASSIGNMENT_CONFLICT`, `NO_AGENT_IN_ZONE`,
`ALL_AT_CAPACITY`.
