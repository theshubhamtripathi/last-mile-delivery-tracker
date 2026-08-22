# Requirements traceability

Every line of the brief mapped to where it is implemented and proven.

| Requirement | Where | Proof |
|---|---|---|
| Inputs: pickup/drop address, L×B×H, weight, order type, payment type | `QuoteRequestDto`, `CreateOrderDto` (`packages/shared/src/dto`) | Order form `apps/web/app/orders/new` |
| Admin manages zones, assigns areas to zones | `zones` module; `ServiceArea.zoneId` | `GET/POST /admin/zones`, `/admin/areas`; Admin → Zones |
| Admin configures rate cards: intra/inter, B2B/B2C | `RateCard` + `RateSlab`; `AdminRatingService` | `GET/POST /admin/rate-cards`; seed has all four |
| Admin configures COD surcharge per order type | `SurchargeRule`; seed `seed_cod_b2c/b2b` | `POST /admin/surcharges` |
| Customer register / login / place order | `auth` module; `orders` module | `/auth/*`, `POST /orders` |
| Admin creates order on behalf of a customer | `CreateOrderDto.onBehalfOfCustomerId` | `OrdersService.resolveCustomer` |
| Detect pickup and drop zones | `ZoneResolverService` | `POST /quotes` returns resolution method |
| Volumetric = L×B×H ÷ divisor (configurable) | `computeCharge` step 2; `PricingConfig.volumetricDivisor` | pricing tests |
| Bill on higher of actual vs volumetric | `computeCharge` step 3 | tests: actual/volumetric/tie |
| Apply zone rate from correct card (B2B/B2C) | `computeCharge` step 4 | tests: B2B vs B2C, specificity |
| Add COD surcharge where applicable | `computeCharge` step 6 | tests: flat/percent/greater-of/clamps |
| **Charge shown before customer confirms** | `POST /quotes` + live waybill panel | order form; `409 QUOTE_STALE` on drift |
| Admin manually assigns an agent | `AssignmentService.assignManual` | `POST /orders/:id/assign {agentId}` |
| Admin triggers auto-assignment to nearest available | `AutoAssignmentService` | `POST /orders/:id/assign {strategy:"AUTO"}` |
| Agent updates status (Picked Up … Delivered/Failed) | `LifecycleService`; state machine | `POST /orders/:id/status`; agent app |
| On failure: notify, reschedule, reassign | `RescheduleService` | `POST /orders/:id/reschedule` excludes failed agent |
| Customer views live status + full timeline | `TrackingService.list`; timeline UI | order detail; public `/track/:num` |
| Email notification on every status change | `NotificationsService` outbox + worker | `/admin/notifications` log |
| Admin views all orders; filter status/zone/agent; override | `OrdersService.list`; `LifecycleService` override | Admin → Orders (URL filters), override panel |
| Role-based auth (customer/agent/admin) | `JwtAuthGuard` + `RolesGuard` | guards on every route |
| Immutable history: change logged with timestamp + actor | `OrderStatusEvent` + trigger + hash chain | `/tracking/verify`; DB trigger |
| Email **and SMS** integration (free tier) | Resend + Twilio via `fetch`; console fallback | `/admin/notifications` (EMAIL + SMS rows) |
| All rate config admin-editable, no hardcoding | config tables; `AssignmentConfig`; `PricingConfig` | no business literals in code |

## Evaluation-focus coverage

1. **Rate engine** — `docs/rate-engine.md`, 100% branch coverage.
2. **Auto-assignment** — explainable, race-safe; `AssignmentLog` + why-this-agent panel.
3. **Lifecycle + immutable history** — state machine + three-layer immutability.
4. **Schema/data modelling** — `docs/schema.md`.
5. **API design/code structure** — `docs/api.md`, one error envelope, DTO validation.
6. **Documentation** — this folder + README.
