# Application boundaries and deployment model

## Design

Use a TypeScript pnpm workspace managed by Turborepo. The product is one application with three runtime processes: Next.js web, Express API and a background worker. PostgreSQL is the source of truth; Redis supports distributed abuse controls. This follows the stack and individual scheduling scope already defined in [scope.md](scope.md).

The runtime applications and shared TypeScript configuration have minimal workspace scaffolds. The boundaries below describe intended product behavior; booking, authentication and integrations are not implemented. Better Auth with Google and email/password sign-in is defined in [authentication.md](authentication.md). Hosting vendors and the email provider remain undecided.

## Runtime boundaries

| Application | Owns | Boundary |
|---|---|---|
| `apps/web` | Public booking pages, host dashboard, rendering and client interaction | Calls the API; does not access PostgreSQL, OAuth credentials or implement authoritative booking rules |
| `apps/api` | Authentication enforcement, authorization, validation, availability, booking transactions and OAuth callbacks | Owns synchronous business decisions and records durable side effects; does not wait for confirmation email delivery |
| `apps/worker` | Calendar writes, emails, reminders, retries and recovery | Processes persisted jobs; does not expose public booking endpoints or bypass booking lifecycle rules |

Zustand holds scoped shared client interaction state. TanStack Query owns fetched API state. Neither client store decides whether a reservation is valid; the API revalidates every submission.

Server-side Next.js rendering uses the same API boundary. Private requests forward only the authenticated request context required by the selected session mechanism and must not enter shared page caches. Public projections omit guest details and credentials.

## Shared packages

| Package | Responsibility | Consumers |
|---|---|---|
| `packages/contracts` | Zod request/response schemas and inferred API types | Web and API; no database or server-secret imports |
| `packages/db` | Drizzle schema, migrations and database access configuration | API, worker and migration tooling only |
| `packages/typescript-config` | Shared TypeScript compiler settings | Workspace applications/packages |
| `packages/eslint-config` | Shared lint configuration | Workspace applications/packages |
| `packages/ui` | Accessible presentation primitives when reuse warrants extraction | Frontend consumers only |

Extract shared server behavior only when API and worker both need it; avoid importing executable application entry points between applications. Runtime applications consume packages, and packages do not depend on applications. Do not create an empty domain framework or generic provider abstraction in anticipation of additional integrations.

## Booking and consistency

1. Validate guest input and event configuration, then fetch required calendar busy periods with bounded timeouts. A failed required check prevents booking admission.
2. In a short database transaction, serialize admission for the host, recheck current local scheduling rules and limits, and claim the occupied interval. Use database overlap enforcement across active reservations for the host, including buffers.
3. Persist booking details, the idempotency result and durable jobs in the same transaction. A conflict rolls back the entire change and returns an actionable response.
4. Return the accepted reservation. The worker performs email and calendar writes, recording delivery/synchronization outcomes separately from reservation status.

Do not hold database locks while calling external providers. External calendar changes can still race with local admission; Google and PostgreSQL do not share a transaction. The [Calendar policy](google-calendar.md) preserves bookings and pauses new admission until reconnect/review when access is lost or an external conflict is identified.

Cancellation and rescheduling use the same host admission discipline. Replacing a reservation is atomic: failure leaves the original intact. Job revisions prevent stale work from overwriting a newer booking state. Workers recheck eligibility before sending reminders.

Persist booking instants as UTC timestamps and recurring availability with its IANA timezone. Keep event details needed for booking history as snapshots. Daylight-saving ambiguity and daily-limit semantics require explicit product policies.

## Background work

Use a PostgreSQL outbox/job table so accepting a booking and recording its side effects cannot diverge. Workers claim due work with bounded leases, acknowledge completion, recover expired leases and apply bounded retries with backoff. Permanently failed work remains inspectable and retryable through audited operator actions.

Processing is at least once. Calendar writes use stable provider identifiers and reconciliation after ambiguous responses. Email delivery may duplicate after an ambiguous provider failure unless the chosen provider offers suitable deduplication. Never claim exactly-once external delivery.

Redis is not required to persist reservations or jobs. Its outage policy for rate-limited endpoints remains a security/reliability decision. Start without an availability cache; add caching only after measurement, and never treat cached slots as authoritative at submission.

## Deployment topology

```text
Browser
  |
  v
TLS ingress / reverse proxy
  |-- web routes ----------> Next.js
  |-- API routes ----------> Express ----> PostgreSQL
                                |-------> Redis
                                |-------> Google Calendar reads / OAuth

Background worker ----------------------> PostgreSQL jobs
                  |---------------------> Google Calendar writes
                  |---------------------> Email provider
```

Serve web and API through one public origin, with a reserved API prefix routed to Express. This keeps session-cookie handling straightforward; the exact prefix and authentication routes are finalized when the API is configured. Browser traffic uses HTTPS. Database and Redis endpoints are private, with credentials available only to authorized server processes.

Run web, API and worker as separately deployable processes or containers, using one versioned release built from the same source revision. This is a deployment boundary within one product, not separate microservices. Scale process instances when measured load requires it; booking correctness and job claiming must not depend on one instance or in-memory locks.

Use separate local, staging and production databases, credentials and provider configuration. Local PostgreSQL and Redis can run through Docker Compose. Container images and the production hosting provider are implementation choices still to be finalized; Kubernetes is not required by this design.

## Release and recovery

- Run versioned migrations once through a controlled deployment step, not independently at every replica startup. Schema changes must remain compatible with the running release during rollout.
- Validate environment configuration before serving traffic. Report process liveness separately from dependency readiness; the worker reports heartbeat and queue lag rather than offering a public endpoint.
- Stop admitting new work during shutdown, drain in-flight requests/jobs within a bounded grace period, and close database connections. Expired leases recover interrupted jobs.
- Capture structured request/job identifiers, booking outcomes, queue lag and provider failures; redact guest data, tokens and secrets.
- Verify database backups through restoration and rehearse application rollback. Avoid destructive down migrations as an automatic rollback mechanism.

Traffic targets, pool sizes, timeouts, alert thresholds, backup retention and recovery objectives must be chosen from operating requirements. This document does not invent numerical production guarantees.

## Security boundaries

Authenticate and authorize on the API for every private operation. Scope database reads and writes to the authenticated host; guest management tokens grant access only to the intended booking action. Validate data at trust boundaries with Zod, enforce request/range limits, and escape rendered guest content.

Keep session and OAuth credentials on the server, encrypt stored integration tokens, and use separate secrets per environment. Cookie security, CSRF handling, OAuth scopes and token lifecycle are defined in the authentication and calendar policies before those integrations are implemented.

## Verification

Review boundaries against the release scope. During implementation, verify import boundaries, real-database transaction races, worker crash recovery, provider failures and cross-host authorization. Staging must demonstrate the complete booking lifecycle and recovery before production release. Documentation completion does not establish runtime correctness.
