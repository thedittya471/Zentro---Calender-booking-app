# Zentro

A pnpm/Turborepo workspace for Zentro, an individual meeting scheduling app. Product boundaries and integration policies live in [docs/scope.md](docs/scope.md) and [docs/architecture.md](docs/architecture.md).

## Local development

Use Node.js 24 and pnpm 11.5.3. Dependency installation scripts are disabled unless explicitly approved in the workspace configuration.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The web app runs at http://localhost:3000. The API scaffold binds to http://127.0.0.1:3001 and returns 404 for all paths until endpoints exist. The worker development watcher runs the scaffold, which logs that job processing is unconfigured and exits until the next source change.

The API validates `NODE_ENV` (`development`, `test` or `production`), `API_HOST` (an IPv4/IPv6 address) and `API_PORT` (an integer from 1 through 65535) before opening its listener. Missing values default to `development`, `127.0.0.1` and `3001`; explicitly empty or invalid values terminate startup with the setting name, without printing its value. Export settings in your shell or inject them through your deployment environment; root `.env` is used by Compose and is not automatically loaded by the API. For example, `API_PORT=3002 pnpm dev` changes the API port. Container deployments must explicitly set `NODE_ENV=production` and `API_HOST=0.0.0.0` (or `::` for IPv6) when external access is intended. No server configuration is imported by the web app; the worker has no configuration consumers yet.

## Local PostgreSQL and Redis

Start Docker Desktop or another compatible Docker daemon, then run:

```sh
pnpm infra:up
pnpm infra:status
pnpm infra:check
```

Compose runs version-pinned PostgreSQL and Redis images and waits for both health checks. Host ports bind to `127.0.0.1` only. Defaults are PostgreSQL on 5432 and Redis on 6379, with development-only credentials from [.env.example](.env.example). To override them, copy the example to an ignored root `.env` and edit it. If ports or credentials change, update the connection URLs too; URL-encode special characters in URL credentials. Do not use production data or credentials in this stack.

The connection check runs an authenticated PostgreSQL query and Redis PING inside the containers. It does not prove that application clients are integrated or that host port connectivity works. API/worker environment loading and database connections are not implemented yet.

Named volumes preserve PostgreSQL data and Redis append-only files when containers are recreated. PostgreSQL 18 uses a volume at `/var/lib/postgresql`; see the [official PostgreSQL image](https://hub.docker.com/_/postgres). Changing initialization credentials in `.env` does not change an existing PostgreSQL database password. Update it explicitly rather than deleting data. The initialization database user has local superuser privileges; production requires a separate least-privileged application role.

Stop and remove only this stack's containers/network while retaining its volumes:

```sh
pnpm infra:down
```

Do not add `--volumes` unless you intentionally want to delete local data. Keep development volumes separate from test fixtures. Image patch upgrades should be reviewed; PostgreSQL major upgrades require an explicit migration, not just changing the image tag.

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

The smoke check starts built applications on ports 3000/3001, verifies their responses and stops them. Keep those ports free when running it.

After a build, start each application separately:

```sh
pnpm --filter @repo/web start
pnpm --filter @repo/api start
pnpm --filter @repo/worker start
```

The worker start command exits immediately: no background work is implemented. Graceful production shutdown, authentication, database connections and scheduling features are not implemented yet. The workspace build does not require secrets or external services.

Shared TypeScript settings live in `packages/typescript-config`. Database, contracts and UI packages will be added with their first consumers.

ESLint uses one root flat configuration for workspace source and scripts, with TypeScript recommended rules and Next.js/React rules scoped to the web app. Warnings fail the lint command. Prettier owns formatting; generated output and the generated lockfile are excluded.

The root Next.js development dependency provides the parser required by `eslint-config-next`; keep its version aligned with the web app. Next.js documents ESLint 10 support, although some bundled plugins still declare older ESLint peer ranges and produce installation warnings. See the [Next.js lint configuration reference](https://nextjs.org/docs/app/api-reference/config/eslint). No peer-range overrides are applied.

Use `pnpm lint:fix` for safe automatic lint fixes and `pnpm format` to apply formatting. Review the resulting diff. Formatting and linting are separate checks; neither replaces type checking or tests.

## Continuous integration

[CI](.github/workflows/ci.yml) runs on pull requests, pushes to `main` and manual dispatch. It uses the Node.js version in `.node-version`, the pnpm version in `package.json` and a frozen lockfile install, with the pnpm store cached by lockfile.

The `Quality checks` job checks formatting, lint, types, API/database tests and built application startup. It uses the same disposable PostgreSQL Compose stack as local tests and attempts cleanup after failures or cancellation. No application secrets or development services are needed. Actions are pinned to release commit hashes; update those hashes deliberately when upgrading.

To enforce checks before merging, configure a GitHub branch ruleset for `main` requiring `Quality checks` after its first successful run. The workflow alone does not prevent merging; repository rules are managed separately. Action setup follows the official [checkout](https://github.com/actions/checkout), [Node.js](https://github.com/actions/setup-node) and [pnpm](https://github.com/pnpm/action-setup) guidance.
