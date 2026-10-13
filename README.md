# Scheduling

A pnpm/Turborepo workspace for individual meeting scheduling. Product boundaries and integration policies live in [docs/scope.md](docs/scope.md) and [docs/architecture.md](docs/architecture.md).

## Local development

Use Node.js 24 and pnpm 11.5.3. Dependency installation scripts are disabled unless explicitly approved in the workspace configuration.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The web app runs at http://localhost:3000. The API scaffold binds to http://127.0.0.1:3001 and returns 404 for all paths until endpoints exist. The worker development watcher runs the scaffold, which logs that job processing is unconfigured and exits until the next source change.

## Verification and build

```sh
pnpm check-types
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
