# Zentro

A pnpm/Turborepo workspace for Zentro, an individual meeting scheduling app. Product boundaries and integration policies live in [docs/scope.md](docs/scope.md) and [docs/architecture.md](docs/architecture.md).

## Local development

Use Node.js 24 and pnpm 11.5.3. Dependency installation scripts are disabled unless explicitly approved in the workspace configuration.

```sh
pnpm install --frozen-lockfile
# Create an ignored local configuration file, then adjust its ports and credentials.
cp -n .env.example .env
pnpm infra:up
pnpm dev
```

The web app runs at http://localhost:3000. The API binds to http://127.0.0.1:3001, exposes health probes and returns 404 for unmatched paths. The worker development watcher runs the scaffold, which logs that job processing is unconfigured and exits until the next source change.

`pnpm dev` uses Turborepo's terminal UI: select a task with ↑/↓ (or `j`/`k`) to view its separate logs, press `h` to toggle fullscreen logs, `m` for keyboard shortcuts and `Ctrl+C` to stop all development tasks. The task list includes web, API, worker and database compilation. For plain streamed output, run `pnpm exec turbo run dev --ui=stream`; noninteractive terminals also use streamed output.

The API validates `NODE_ENV` (`development`, `test` or `production`), `API_HOST` (an IPv4/IPv6 address) and `API_PORT` (an integer from 1 through 65535) before opening its listener. Missing values default to `development`, `127.0.0.1` and `3001`; explicitly empty or invalid values terminate startup with the setting name, without printing its value. The API development command loads the ignored root `.env` if present; existing shell variables take precedence, including empty or invalid values. For example, `API_PORT=3002 pnpm dev` changes the API port. Restart the development command after editing `.env`. Production startup and migration commands require settings exported in the shell or injected through the deployment environment. Container deployments must explicitly set `NODE_ENV=production` and `API_HOST=0.0.0.0` (or `::` for IPv6) when external access is intended. No server configuration is imported by the web app; the worker has no configuration consumers yet.

## Frontend API access

The workspace includes an on-demand service connection check. It checks API/database readiness only; it does not enable scheduling. TanStack Query owns API response state in a memory-only, workspace-scoped cache: reads are fresh for 30 seconds and unused entries expire after five minutes. Requests are deduplicated; automatic retries, focus refresh and mutation retries are disabled. The readiness screen additionally disables reconnect/mount refresh and offers an explicit retry. Pending and failure feedback never present a failed check as success.

The typed readiness call uses `/api/health/ready`, validates JSON before caching it and rejects non-success HTTP responses. Browser requests have a 10-second deadline and accept query cancellation. The exact Next.js bridge calls Express `/health/ready` with a six-second deadline, no redirects, no browser cookies/authorization and no HTTP caching. This is a public health bridge, not a general authenticated proxy. It returns only validated readiness or a sanitized 503, including on missing configuration or unreachable/malformed upstream responses.

Set server-only `API_ORIGIN` to the API's HTTP(S) origin (no credentials, path, query or fragment). Development defaults to `http://127.0.0.1:3001`; production has no fallback. For a custom API port, run `API_PORT=3002 API_ORIGIN=http://127.0.0.1:3002 pnpm dev`. Export `API_ORIGIN` in the web process environment or use an ignored `apps/web/.env.local`; Next.js does not load the root API `.env`. Production startup needs the value injected into the web runtime, not exposed as a `NEXT_PUBLIC_*` variable. Builds do not contact the API or require its origin.

Keep future reads beside their runtime response validators and query options; add contracts with actual domain endpoints. Private query keys must include account identity, and logout/account changes must clear private cached data when authentication is implemented. Do not put private data into persistent browser storage or shared server query clients. Authoritative validation and authorization stay in Express. See [TanStack defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults) and [Next.js route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route).

## Web application shell

The public entry at `/` links to the workspace preview at `/dashboard`. Its shared navigation includes overview, event types, bookings, availability and calendars, with the current page marked for assistive technology. Navigation stays visible and wraps on small screens; desktop layouts use a sidebar. A keyboard skip link moves focus directly to the main content.

The landing page centers an editorial hero above a time-studio console, then pairs a sticky chapter index with three vertical story panels on spacious screens. GSAP ScrollTrigger separates calendar tiles and assembles the invitation and meeting illustrations; mobile uses a simpler reading flow. A bounded, event-driven WebGL scene splits and reforms behind the content, with a static CSS fallback when graphics are unavailable or reduced motion is requested. Motion provides workspace entrance transitions and disclosure indicators; Radix Accordion provides the FAQ controls. Animation setup is scoped and reverted on navigation or preference changes. Static text, internal links and labelled illustrations render before animation setup. The shared visual and accessibility contract is in [design.md](design.md).

The workspace and its section pages are static previews. They expose no account or booking data and clearly identify unavailable features. Unknown addresses return a 404 with a link back to the overview. Authentication enforcement belongs to the later identity integration before private data or mutations are introduced. Public booking pages remain outside the dashboard layout.

## Local PostgreSQL and Redis

Start Docker Desktop or another compatible Docker daemon, then run:

```sh
pnpm infra:up
pnpm infra:status
pnpm infra:check
```

Compose runs version-pinned PostgreSQL and Redis images and waits for both health checks. Host ports bind to `127.0.0.1` only. Defaults are PostgreSQL on 5432 and Redis on 6379, with development-only credentials from [.env.example](.env.example). To override them, copy the example to an ignored root `.env` and edit it. If ports or credentials change, update the connection URLs too; URL-encode special characters in URL credentials. Do not use production data or credentials in this stack.

The connection check runs an authenticated PostgreSQL query and Redis PING inside the containers. It does not prove host port connectivity. The API checks PostgreSQL through its pool before listening; its development command loads root `.env`, while production startup and migration commands do not. The worker has no database consumer yet.

Named volumes preserve PostgreSQL data and Redis append-only files when containers are recreated. PostgreSQL 18 uses a volume at `/var/lib/postgresql`; see the [official PostgreSQL image](https://hub.docker.com/_/postgres). Changing initialization credentials in `.env` does not change an existing PostgreSQL database password. Update it explicitly rather than deleting data. The initialization database user has local superuser privileges; production requires a separate least-privileged application role.

Stop and remove only this stack's containers/network while retaining its volumes:

```sh
pnpm infra:down
```

Do not add `--volumes` unless you intentionally want to delete local data. Keep development volumes separate from test fixtures. Image patch upgrades should be reviewed; PostgreSQL major upgrades require an explicit migration, not just changing the image tag.

## Database connections and migrations

The API requires an explicit `DATABASE_URL` with a PostgreSQL scheme, host, username, password and database. Invalid configuration fails before connecting and omits its value from errors. `DB_POOL_MAX` is an integer from 1–100, defaulting to 10 connections per process. Budget the total across all API/worker replicas and leave capacity for migrations and administration; these defaults are starting limits, not measured production capacity. Connection/pool acquisition times out after 3 seconds, statements and idle transactions after 5 seconds, and unused connections close after 10 seconds. Idle pool failures log only `database_pool_error`; startup connection failures never advertise a listener.

Production connections require certificate-verified TLS. The only supported URL query setting is `sslmode=verify-full`, or `sslmode=disable` in development/test. Other query settings are rejected so URLs cannot override timeout or TLS policy. Use `NODE_EXTRA_CA_CERTS` for a trusted private CA; never disable certificate verification. The current connection contract supports password authentication. See [node-postgres pooling](https://node-postgres.com/apis/pool) and [TLS configuration](https://node-postgres.com/features/ssl).

Schema definitions live in `packages/db/src/schema.ts`, currently with no domain tables. Generate SQL and snapshots without a database connection:

```sh
pnpm db:generate
```

Review and commit generated SQL, snapshots and the journal in `packages/db/drizzle` together. Never edit applied migrations or use schema push against a deployed database. Apply migrations once through a controlled deployment step, using a DDL-capable migration role and the intended database URL:

```sh
pnpm db:migrate
# A built deployment can run the same entry point without development tooling:
node packages/db/dist/migrate.js
```

Ship the `@repo/db` workspace dependency, including `packages/db/dist` and `packages/db/drizzle`, with the API deployment. The migration runner uses one connection, records applied migrations in `drizzle.__drizzle_migrations`, closes its pool on success/failure, and exits nonzero with a sanitized `migration_failed` event on SQL/connection failure. It validates database settings independently of API listener settings. It uses the same timeout bounds as the API; review long DDL/backfills separately. Serialize migration jobs: this runner does not coordinate concurrent deployments. Application startup never runs migrations. Repeating a successful migration run preserves data and applies no duplicate SQL. There are no product migrations yet; an empty run initializes only Drizzle's bookkeeping. See [Drizzle generation](https://orm.drizzle.team/docs/drizzle-kit-generate) and [migration configuration](https://orm.drizzle.team/docs/drizzle-config-file).

On SIGINT/SIGTERM the API stops accepting connections, drains requests, and closes its pool. A 10-second deadline forces a nonzero exit if draining cannot finish. Listener failures also release the pool. `app.ts` remains limited to Express middleware and route wiring.

## API health probes

| Endpoint            | Success                                                    | Dependency failure                                                                                  |
| ------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /health/live`  | 200 with `{ "status": "alive" }`                           | Still 200 while the HTTP process can respond; performs no dependency checks                         |
| `GET /health/ready` | 200 with `{ "status": "ready" }` after PostgreSQL responds | 503 with `{ "error": { "code": "NOT_READY", "message": "Service not ready" }, "requestId": "..." }` |

Both endpoints are public, contain no credentials or dependency details, carry a server-generated `X-Request-ID`, support HEAD, and set `Cache-Control: no-store`. They precede the JSON parser and domain routers. Readiness uses a fresh `SELECT 1` through the same pool as application requests: acquisition/connection has the existing 3-second deadline, followed by a 2-second client-side query deadline. Failed/timed-out checks return 503 rather than stale success; the pool discards a timed-out query client. Subsequent probes can recover without restarting the process. Choose probe timeouts allowing for these bounds and request overhead.

The server refuses readiness when shutdown begins, including if shutdown starts during a check. A factory without a configured check reports 503. Readiness failures log only `readiness_failed`, the request ID and `NOT_READY`, never raw database errors. Use liveness for process checks and readiness for traffic admission. PostgreSQL connectivity does not establish schema compatibility, provider access or end-user scheduling correctness. Redis and the worker have no active runtime dependency checks yet; add them with their real consumers and agreed failure policies.

## Verification and build

The API parses `application/json` object/array bodies with an explicit 100 KiB byte limit. Malformed JSON returns 400, oversized JSON returns 413 and compressed bodies or unsupported charsets return 415, with generic errors that omit payloads and stack traces. Other media types are left unparsed; no form, text, upload or raw-body parser is installed. Parsing does not replace route-specific validation. Future Better Auth handlers must be mounted before JSON middleware so their request streams remain intact. See the official [body-parser options](https://expressjs.com/en/resources/middleware/body-parser/) and [Better Auth Express integration](https://better-auth.com/docs/integrations/express).

Each API request receives a new server-generated UUID in `X-Request-ID`, also available to handlers through `response.locals.requestId`. Caller-supplied IDs are replaced. Errors use `{ "error": { "code": "NOT_FOUND", "message": "Route not found" }, "requestId": "..." }`. Stable codes are `INVALID_REQUEST_BODY` (400), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE` (415), `NOT_FOUND` (404) and `INTERNAL_ERROR` (500). Unexpected failures use a fixed public message and log only a structured event, request ID and code; request data and original exception details are omitted. If headers have already been sent, the failed response stream is closed instead of attempting another response. Register domain routers through `createApp(routes)` so the final not-found/error middleware follows the routes. Express 5 automatically forwards rejected route promises; see [Express error handling](https://expressjs.com/en/guide/error-handling/).

API and database integration tests use Node's built-in test runner, `tsx` and the test-only PostgreSQL client. Start the separate disposable database before the full suite:

```sh
pnpm test:infra:up
pnpm test
pnpm test:infra:down
```

The test Compose project binds PostgreSQL to `127.0.0.1:55432`, uses fixed test-only credentials and stores data in tmpfs, with no development volumes. Its data is disposable when the container is removed. The fixture ignores application/libpq connection settings and checks database/user identity before creating a unique schema for each invocation. Tests must create data in their fixture schema; do not qualify writes into shared schemas or point fixtures at development/production databases. Cleanup rolls back unfinished transactions, drops only the generated schema and closes the connection, including after test failures. Recreate the disposable container if a forcibly terminated run leaves stale fixtures.

`pnpm test:api` runs the API fixture tests without a database. The application factory creates the same Express app used by the server entry point; tests bind random localhost ports and close listeners in finally blocks. Fixtures validate the existing scaffold, not unimplemented scheduling endpoints. Both suites use bounded test timeouts; a missing test database fails the full suite rather than skipping coverage. Stop the test stack after verification, including when tests fail. Database checks require Docker and permission to connect locally.

```sh
pnpm check-types
pnpm lint
pnpm format:check
pnpm build
pnpm test:smoke
```

The smoke check starts built applications on ports 3000/3001, verifies their responses and clean shutdown, and stops them. Keep those ports free and start `pnpm test:infra:up` first; stop it with `pnpm test:infra:down` afterward, including on failure. API smoke processes use fixed test-only database settings and ignore caller host/port/database overrides. Builds and focused `pnpm test:api` still require no database.

After a build, start each application separately:

```sh
pnpm --filter @repo/web start
pnpm --filter @repo/api start
pnpm --filter @repo/worker start
```

The worker start command exits immediately: no background work is implemented. Authentication, domain persistence and scheduling features are not implemented yet. The workspace build does not require secrets or external services.

Shared TypeScript settings live in `packages/typescript-config`. `packages/db` owns PostgreSQL configuration, the Drizzle pool factory, schema and migration tooling. It exports `@repo/db`, `@repo/db/config` and `@repo/db/migrations` as compiled ESM with type declarations; imports do not create connections or run migrations. Browser exports are blocked. Keep it out of web/server-rendering imports as well: all frontend data access goes through the API. Contracts and UI packages will be added with their first consumers.

API code is organized by responsibility: `src/config/env.ts` validates listener settings; `src/middleware` contains request identifiers, not-found and error handlers; `src/server/start.ts` owns startup and shutdown. `src/app.ts` wires Express and `src/index.ts` invokes the server entry point. Add feature folders and utilities with actual implementations rather than creating empty layers.

Turborepo builds database dependencies before API builds, type checks, tests and development startup. `pnpm dev` watches database compilation and reloads the API when the compiled dependency changes. `pnpm test` and `pnpm test:api` build their dependencies automatically; standalone app start commands require an existing workspace build.

ESLint uses one root flat configuration for workspace source and scripts, with TypeScript recommended rules and Next.js/React rules scoped to the web app. Warnings fail the lint command. Prettier owns formatting; generated output and the generated lockfile are excluded.

The root Next.js development dependency provides the parser required by `eslint-config-next`; keep its version aligned with the web app. Next.js documents ESLint 10 support, although some bundled plugins still declare older ESLint peer ranges and produce installation warnings. See the [Next.js lint configuration reference](https://nextjs.org/docs/app/api-reference/config/eslint). No peer-range overrides are applied.

Use `pnpm lint:fix` for safe automatic lint fixes and `pnpm format` to apply formatting. Review the resulting diff. Formatting and linting are separate checks; neither replaces type checking or tests.

## Commit checks

`pnpm install --frozen-lockfile` runs `prepare` to install [Husky](https://typicode.github.io/husky/get-started.html) hooks. Run `pnpm prepare` once if dependencies were installed with scripts disabled. Git commits run `pnpm check:staged`: Prettier automatically formats supported staged files using the existing ignore rules, then ESLint checks staged JavaScript/TypeScript with warnings treated as failures. These tasks run sequentially so lint reads the formatted files. Unsupported assets and generated files follow the existing tool exclusions.

lint-staged adds the formatting fixes to the staged changes automatically; no extra `git add` is needed. Syntax or lint errors still block the commit. On failure, its default rollback restores the pre-hook content and staging. Fix the reported errors, review the diff and stage your intended changes again; use `pnpm lint:fix` where appropriate. [lint-staged](https://github.com/lint-staged/lint-staged) temporarily hides unstaged edits to partially staged files, formats the staged version and restores the edits afterward without adding them to the commit. Keep its default backup/restore behavior enabled.

Run `pnpm test:hooks` to exercise hook installation, acceptance/rejection and partial-staging preservation in a disposable Git repository. This test does not stage or commit project changes. CI sets `HUSKY=0` to skip local hook installation but runs the regression test and retains full-repository formatting, lint, type, integration and build checks. Hooks check changed files; they can be bypassed and do not guarantee all CI checks will pass. Database tests and builds stay out of the pre-commit path.

Git GUI clients need the project's Node.js and pnpm on their PATH. If a GUI cannot find them, configure the environment in Husky's user-level `~/.config/husky/init.sh`; do not hard-code a developer-specific runtime path in the repository.

## Continuous integration

[CI](.github/workflows/ci.yml) runs on pull requests, pushes to `main` and manual dispatch. It uses the Node.js version in `.node-version`, the pnpm version in `package.json` and a frozen lockfile install, with the pnpm store cached by lockfile.

The `Quality checks` job checks formatting, lint, types, API/database tests and built application startup. It uses the same disposable PostgreSQL Compose stack as local tests and attempts cleanup after failures or cancellation. No application secrets or development services are needed. Actions are pinned to release commit hashes; update those hashes deliberately when upgrading.

To enforce checks before merging, configure a GitHub branch ruleset for `main` requiring `Quality checks` after its first successful run. The workflow alone does not prevent merging; repository rules are managed separately. Action setup follows the official [checkout](https://github.com/actions/checkout), [Node.js](https://github.com/actions/setup-node) and [pnpm](https://github.com/pnpm/action-setup) guidance.
