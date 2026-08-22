# Dependency policy

The submission guidelines require minimal, native dependencies. Every runtime
dependency below earns its place in one line; anything not here is solved with
the standard library or the framework already present. Adding a dependency
requires a justification in the commit body and a new row here.

## Backend — `apps/api`

| Package | Why it is here |
|---|---|
| `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` | The framework: modules, DI, guards, pipes. Reads as engineered, not scripted. |
| `@nestjs/config` | Typed, validated environment loading; fails fast on a bad config at boot. |
| `@nestjs/jwt` | Signs/verifies the access and refresh JWTs. No Passport — the strategies add three packages for a 30-line check. |
| `@nestjs/swagger` | Live API docs at `/docs`, a required deliverable, generated from the DTOs. |
| `@nestjs/throttler` | Rate limiting on auth and mutation routes. First-party. |
| `@nestjs/schedule` | Drives the notification outbox worker. First-party, no cron dependency. |
| `@prisma/client` | Typed database client generated from the schema. |
| `bcryptjs` | Password hashing. Pure-JS, no native build step, portable to any host. |
| `class-validator`, `class-transformer` | One validation source of truth: the shared DTOs, imported by API and web. |
| `cookie-parser` | Reads the httpOnly session cookies. |
| `helmet` | Standard security headers. |
| `reflect-metadata` | Required by Nest's decorator metadata. |
| `rxjs` | Nest's dependency for interceptors/streams. |

Email (Resend) and SMS (Twilio) are called over their REST APIs with `fetch` —
**no SDKs**. With no keys present the app uses a console provider and stays
fully demonstrable.

## Frontend — `apps/web`

| Package | Why it is here |
|---|---|
| `next` | App Router, server components, one-click Vercel deploy. |
| `react`, `react-dom` | Next's runtime. |
| `tailwindcss`, `postcss`, `autoprefixer` | Utility styling for a hand-built component layer — **no component library**, which is both the differentiator and the minimal-dependency choice. |

No charting library (hand-rolled SVG bars), no icon package (inline SVG), no
date library (native `Date` + `Intl`), no client-cache library (a ~60-line typed
`fetch` client), no UUID package (Prisma `cuid()`), self-hosted fonts via
`next/font` (no external font request, no dependency).

## Shared — `packages/shared`

| Package | Why it is here |
|---|---|
| `class-validator`, `class-transformer` | DTO definitions consumed by both apps. |

## Tooling (dev only)

Jest + Supertest (ship with the Nest scaffold), TypeScript, ESLint, Prisma CLL,
`ts-node` for the seed, Prisma CLI for migrations. No extra test or build
dependency beyond these.
