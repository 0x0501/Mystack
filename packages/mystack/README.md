# Mystack CLI

Create a configured TanStack Start application with the `@0x0501/mystack` CLI. Install Node.js 22.12+ and Bun, then open the wizard:

```sh
bunx @0x0501/mystack
bunx @0x0501/mystack@latest create my-app
```

The package is owned by the personal npm account `0x0501`. Generated projects use Bun and ship their own configuration-specific `README.md` plus `docs/project-guide.md`. New application users do not need a starter checkout. You can also install the CLI globally with `npm install --global @0x0501/mystack` and run `mystack create`.

For explicit configurations:

```sh
bunx @0x0501/mystack@latest create my-app --yes --database d1 --deployment cloudflare --email resend --payments stripe,polar
bunx @0x0501/mystack@latest create my-app --yes --database turso-local --deployment bun --email resend --payments none --no-install
```

The executable runs on Node 22.12+. Generated projects use Bun to install dependencies and run scripts. The wizard follows TanStack CLI's Clack interaction: guided selections, keyboard hints, a configuration summary and final confirmation, progress indicators, and commands to start the project. Use arrow keys to navigate, Space to toggle payment providers, and Enter to confirm; an empty payment selection means none. Ctrl-C or Escape cancels during configuration without creating a project. D1 and Cloudflare Email show incompatible options as disabled with a reason. Flags use the same validation rules; `--yes` skips all prompts. Failed dependency installation keeps the generated project and shows the command to retry.

## Databases

| Choice | Flag | Connection | Deployments |
|---|---|---|---|
| PostgreSQL | `pg` | Direct app-role `DATABASE_URL` | Nitro, Bun |
| PostgreSQL (Hyperdrive) | `pg-hyperdrive` | Cloudflare `HYPERDRIVE` binding | Cloudflare Workers |
| Cloudflare D1 | `d1` | Cloudflare `DB` binding | Cloudflare Workers |
| Turso Cloud | `turso-cloud` | Local development in `.local/turso-local.db`; remote URL and token in production | All |
| Turso Local (libSQL) | `turso-local` | `TURSO_DATABASE_URL=file:.local/turso-local.db`, no cloud token | Nitro, Bun |
| Bun SQLite | `bun-sqlite` | Native `bun:sqlite`, `SQLITE_DATABASE_PATH=local.db` | Bun |

The default is PostgreSQL (Hyperdrive) with Cloudflare Workers. PostgreSQL migrations use the privileged `DATABASE_MIGRATION_URL`; runtime connections use the app role. Both Turso variants develop locally without cloud credentials. Nitro/Bun open `file:.local/turso-local.db` directly and create its directory automatically. Turso Cloud on Workers uses the [official Turso CLI local server](https://docs.turso.tech/local-development): install the CLI and keep `bun run db:up` running in a separate terminal. It serves `http://127.0.0.1:8080` and persists data with `turso dev --db-file .local/turso-local.db`. Turso Cloud production requires a remote `libsql://` or `https://` URL and token in `.env.prod`; `bun run db:migrate:remote` reads that file for cloud migrations. Local databases need persistent file storage in production; generated projects ignore `.local/`, database files and their WAL sidecars in Git.

```sh
bunx @0x0501/mystack@latest create cloud-app --database turso-cloud
bunx @0x0501/mystack@latest create local-app --database turso-local --deployment nitro --email resend
bunx @0x0501/mystack@latest create bun-app --database bun-sqlite --deployment bun --email resend
```

## Start your application

Enter the generated directory, copy `.env.example` to `.env`, and configure the selected database/provider credentials. If dependencies were skipped or installation failed, run `bun install`. PostgreSQL variants need `bun run db:up` before migration; all variants use `bun run db:migrate` then `bun run dev`. Open http://localhost:3000. Authentication email is logged in development when provider credentials are absent. Follow the generated README for deployment.

`mystack.json` records the creation choices. Editing it does not regenerate or convert an existing application.

## Maintain and distribute the CLI

Contributors use the repository's [maintainer guide](../../docs/contributing.md) for local CLI development, schema generation, tests and release packaging. The root application is the single runnable template source; `template/` is an ignored release snapshot and `assets/` contains alternate files and database fixtures. See [ADR 0012](../../docs/adr/0012-mystack-project-generation.md).

The tarball contains the snapshot, compiled CLI and adapters, and works outside the checkout without fetching a moving Git branch. Maintained code and scripts use TypeScript. `prepack` compiles `src/` to `dist/` for Node and refreshes the snapshot from an explicit allowlist; secrets, Git history, dependencies, and application build output are excluded. Tagged releases publish through GitHub Actions using npm trusted publishing; see the repository's [publishing guide](../../docs/publishing.md) for account setup.

## Extend

`src/catalog.ts` defines option IDs, labels, and compatibility requirements. Both the wizard and noninteractive validation consume it. Category adapters in `src/adapters/` produce source, dependencies, scripts, environment declarations and resource configuration. Add an option to its catalog and implement it in the category adapter. Payment API definitions live in the payment adapter. Add tests for new option combinations before exposing them. Template edits use checked anchors and fail explicitly when the underlying starter changes.

SQLite auth schema is generated from the starter's actual auth config:

```sh
bun packages/mystack/scripts/generate-auth-schema.ts
bun x drizzle-kit generate --config packages/mystack/assets/drizzle.config.ts
```

Never hand-edit the generated auth schema. Platform SQLite tables are maintained in `assets/platform.sqlite.schema.ts`. D1 and Turso use atomic batch operations and a durable `purchase_delivery` event; product fulfillment consumes it using `purchase_id` as its idempotency key. PG supports the transaction callback in `onPurchasePaid`. SQLite authorization is enforced in authenticated/admin middleware and explicit user predicates, rather than PG RLS.

Run `bun run test:cli` for the 208 valid selection combinations, filesystem safety and flag constraints. Run `bun run --cwd packages/mystack test:generated` to install, check, typecheck, test and build all 13 database/runtime/email tuples with all payment providers. PG integration checks need Docker. SQLite tests use real local libSQL, D1 (workerd), and native Bun SQLite, including concurrent confirmation, rollback and credential revocation. Turso Cloud uses an isolated local libSQL fixture for service tests; validating a live cloud connection requires your URL and token. Bun SQLite runs its native database tests with `bun test` after Vitest because `bun:sqlite` is unavailable in Node.

## Reference

The deployment adapters follow [TanStack Start hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting). TanStack CLI composes [base, add-on and template files](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/create-app.ts#L66-L149), renders EJS and merges package metadata. Mystack uses its own fixed catalog, file adapters and checked source transformations; it does not invoke TanStack CLI. See the repository's [source-backed comparison](../../docs/research/tanstack-cli-generation.md). Nitro uses its Node preset; Bun uses Start's server bundle with a native `Bun.serve` entry. Credentials and cloud resource IDs must be supplied by the project owner; generation does not create paid cloud resources.
