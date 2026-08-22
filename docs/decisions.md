# Decision log (ADR-lite)

Each entry: the decision, alternatives considered, why this one, and the
trade-off accepted. These are the choices the author must be able to defend.

## 1. Effective-dated rate cards with frozen pricing snapshots
**Decision:** Rate cards, surcharge rules and pricing config are effective-dated
(`effectiveFrom`/`effectiveTo`). Editing never mutates a row in place — it closes
the old version and creates a new one. Every order freezes the full breakdown as
`pricingSnapshot`.
**Alternatives:** a single mutable price table (simplest); recomputing price on
read.
**Why:** real logistics billing must reproduce a historical charge exactly, and
a reviewer editing a rate must not silently rewrite past orders.
**Trade-off:** more rows and a re-verification step on order creation, in
exchange for temporal correctness and the `QUOTE_STALE` guarantee.

## 2. Money as integer paise
**Decision:** all money is an integer number of paise; one shared `formatINR`
helper renders it.
**Alternatives:** floats; a decimal library.
**Why:** a float rounding error in the pricing engine would mischarge every
order; a decimal dependency is unnecessary for integer arithmetic.
**Trade-off:** must convert at the rupee boundary, which is centralised in
`money.ts`.

## 3. Pure pricing engine in a shared package
**Decision:** the calculator takes input + loaded config + `asOf`; no I/O, no
clock. It lives in `packages/shared` and is imported by both API and web.
**Alternatives:** compute inside a Nest service with DB access.
**Why:** purity makes it exhaustively testable (100% branch) and identical in
the browser preview and the authoritative API path — one implementation, zero
drift.
**Trade-off:** the caller must load configuration and pass it in; a thin
`RatingConfigService` bridges Prisma to the engine's plain types.

## 4. Three-layer immutable tracking history
**Decision:** append-only repository + database `BEFORE UPDATE/DELETE` trigger +
per-order SHA-256 hash chain with a public verify endpoint.
**Alternatives:** "we just don't delete rows" (application-only).
**Why:** the brief says *immutable*; defence in depth means even direct SQL
cannot rewrite history undetected.
**Trade-off:** a trigger migration and a hash computation per append; negligible
cost for a strong guarantee. Proven by tests and a live SQL check.

## 5. Transactional outbox for notifications
**Decision:** the status change and a `NotificationOutbox` row commit in the same
transaction; a scheduled worker drains QUEUED rows with backoff.
**Alternatives:** send email inside the request handler.
**Why:** a rolled-back transaction must not send a phantom email, and a committed
one must not be lost; the request stays fast.
**Trade-off:** a table and a 10s poller versus immediate send.

## 6. Denormalised `Agent.activeOrderCount`
**Decision:** store a running count, mutated only inside the same transaction as
an assignment or terminal status change.
**Alternatives:** `COUNT(*)` on demand.
**Why:** candidate filtering runs on every auto-assign; a denormalised count
keeps it index-friendly.
**Trade-off:** the count must be maintained carefully in every relevant
transaction — centralised in the assignment and lifecycle services.

## 7. Quote-then-confirm with `409 QUOTE_STALE`
**Decision:** `POST /quotes` returns an expiring token; `POST /orders` re-verifies
the price against live config and rejects if it moved.
**Alternatives:** price again at order time and trust it.
**Why:** turns "charge shown before confirmation" into a verifiable guarantee.
**Trade-off:** a quote table and a re-computation, in exchange for provable
integrity.

## 8. Optimistic locking in assignment
**Decision:** assignment reads the agent `version`, then `updateMany` guarded by
that version inside a transaction; a mismatch means someone else assigned first.
**Alternatives:** `SELECT ... FOR UPDATE`; no locking.
**Why:** two admins clicking auto-assign must not double-book one agent.
**Trade-off:** the loser gets `409 ASSIGNMENT_CONFLICT` and retries.

## 9. Zone fallback chain
**Decision:** pincode lookup → Haversine to nearest centroid → `422`.
**Alternatives:** an external geocoding API.
**Why:** no dependency, works offline, and the admin can map any pincode as data.
**Trade-off:** coverage is limited to seeded/known pincodes.

## 10. No Passport, no component library, no SDKs
**Decision:** a ~30-line JWT guard instead of Passport; hand-built React
components instead of a UI kit; Resend/Twilio via `fetch` instead of SDKs.
**Alternatives:** the conventional libraries.
**Why:** the submission guidelines require minimal, native dependencies, and the
hand-built component layer is also the visual differentiator.
**Trade-off:** slightly more code we own and understand — see `docs/dependencies.md`.

## 11. Local Postgres for development, Neon for hosting
**Decision:** the app runs against any PostgreSQL connection string; the README
documents both a local Postgres and a Neon path.
**Why:** a cold clone must run without a cloud account; Neon gives a free hosted
database for the live demo.
**Trade-off:** none material — Prisma abstracts the two.
