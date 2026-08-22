# Last-Mile Delivery Tracker

A production-shaped last-mile logistics platform: customers and admins create
delivery orders, charges are computed by a fully configurable rate engine,
delivery agents are assigned manually or automatically, and every status change
is recorded in an immutable, hash-chained tracking history.

> **Status:** Phase 1 (foundation) — workspace, schema, auth with three roles,
> API bootstrap, and the web skeleton are in place. Pricing, orders, assignment,
> notifications, and the full UI arrive in later phases.

## Demo credentials

Password for every account: `Demo@1234`

| Role | Email |
|---|---|
| Admin | `admin@demo.io` |
| Customer | `customer@demo.io` |
| Agent | `agent@demo.io` |

## Tech stack

- **Backend:** NestJS 10 + TypeScript (strict), Prisma + PostgreSQL (Neon)
- **Frontend:** Next.js 14 (App Router) + Tailwind, hand-built components
- **Shared:** an `@lmd/shared` package holding the pure pricing engine, the
  order state machine, money helpers, and the DTOs — imported by both apps so
  there is one source of truth and zero drift.
- **Money** is integer paise throughout; never a float.

See [`docs/dependencies.md`](docs/dependencies.md) for the dependency policy —
every dependency justified in one line, per the submission guidelines.

## Repository layout

```
apps/
  api/          NestJS API (Prisma schema, modules, seed)
  web/          Next.js frontend
packages/
  shared/       pure domain core: pricing, state machine, money, DTOs
docs/           system design, schema, rate engine, decisions, requirements
scripts/        verify-submission.sh — the guidelines as an executable gate
```

## Local setup

Prerequisites: Node 20 LTS, npm, and a PostgreSQL connection string (a free
[Neon](https://neon.tech) database, or local Postgres).

```bash
# 1. Install
npm install

# 2. Configure — copy the template and fill in DATABASE_URL / DIRECT_URL
cp .env.example .env

# 3. Create the schema and seed the demo data
npm run prisma:deploy --workspace @lmd/api   # or prisma:migrate in development
npm run seed

# 4. Run both apps (API on :4000, web on :3000)
npm run dev
```

- API docs (Swagger): http://localhost:4000/docs
- Health: http://localhost:4000/health and `/health/ready`

## Verification

`npm run verify` runs typecheck, lint, test, build, and the submission-hygiene
gate (`scripts/verify-submission.sh`) — the submission guidelines encoded as an
executable check. It must pass before every push.

## Documentation

- [`docs/dependencies.md`](docs/dependencies.md) — dependency policy
- Further deliverables (system design, ERD, rate-engine spec, requirements
  matrix, decision log) are added in later phases.

## License

MIT — see [`LICENSE`](LICENSE).
