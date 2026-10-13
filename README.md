# Scheduling

A pnpm/Turborepo workspace for individual meeting scheduling. Product boundaries and integration policies live in [docs/scope.md](docs/scope.md) and [docs/architecture.md](docs/architecture.md).

## Local development

Use Node.js 24 and pnpm 11.5.3. Dependency installation scripts are disabled unless explicitly approved in the workspace configuration.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The web app runs at http://localhost:3000. The API scaffold binds to http://127.0.0.1:3001 and returns 404 for all paths until endpoints exist. The worker development watcher runs the scaffold, which logs that job processing is unconfigured and exits until the next source change.

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

The worker start command exits immediately: no background work is implemented. API configuration, production listening/shutdown behavior, authentication, database connections and scheduling features are not implemented yet. The workspace build does not require secrets or external services.

Shared TypeScript settings live in `packages/typescript-config`. Database, contracts and UI packages will be added with their first consumers.

ESLint uses one root flat configuration for workspace source and scripts, with TypeScript recommended rules and Next.js/React rules scoped to the web app. Warnings fail the lint command. Prettier owns formatting; generated output and the generated lockfile are excluded.

The root Next.js development dependency provides the parser required by `eslint-config-next`; keep its version aligned with the web app. Next.js documents ESLint 10 support, although some bundled plugins still declare older ESLint peer ranges and produce installation warnings. See the [Next.js lint configuration reference](https://nextjs.org/docs/app/api-reference/config/eslint). No peer-range overrides are applied.

Use `pnpm lint:fix` for safe automatic lint fixes and `pnpm format` to apply formatting. Review the resulting diff. Formatting and linting are separate checks; neither replaces type checking or tests.
