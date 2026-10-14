# Maintain Mystack and its reference template

This guide is for contributors to the generator. Application users install a CLI release and follow [getting started](./getting-started.md).

## Sources and generated files

The repository root is the only canonical, runnable reference application: PostgreSQL + Hyperdrive, Workers and Cloudflare Email. Edit its source and test it there. `packages/mystack/src/catalog.mjs` defines the choices and compatibility rules shared by prompts and flags. Category adapters in `src/adapters/` modify the in-memory file map and package metadata; `assets/` holds alternative complete source files, schemas, migrations and test harnesses.

`packages/mystack/template/` is a release artifact, ignored by Git. `template:prepare` copies an explicit allowlist from the root, and `prepack` refreshes it before packaging. Edit the root source, never the snapshot. Real environment files, Git history, installed dependencies and build output are excluded. `docs/project-guide.md` is the shared application guide shipped with generated projects; repository tutorials and research stay here.

There is no separate `examples/` or second full application under `templates/`. [ADR 0012](./adr/0012-mystack-project-generation.md) records why and when that decision should be revisited.

## Develop locally

```sh
bun install
bun install --cwd packages/mystack
bun run cli:prepare
bun run mystack create test-app --yes --database bun-sqlite --deployment bun --email resend --payments none --no-install
```

The local CLI reads the prepared snapshot, just like a packaged release. Refresh it after changing the root application. The root `test:cli` tests render directly from the current source, and generated-project verification also uses current source. To run the reference application, see [reference-template.md](./reference-template.md).

## Change an integration

Add an option to the catalog and implement it in the corresponding adapter. The composition order is deployment → database → email → payments. Prefer complete file replacements for independent integration files; modify structured package metadata as objects. Shared source edits use checked anchors that fail when the template drifts. Keep such edits small and explicit; introduce deliberate template insertion points if a shared file needs many variants.

A new directory alone does not remove fragile source replacement. Do not introduce a general plugin engine, AST rewriting or duplicate application trees to handle a fixed set of choices. The [TanStack CLI research](./research/tanstack-cli-generation.md) explains its EJS and add-on composition and the useful parts for Mystack.

Better Auth schemas are generated. After changing root auth plugins/fields, run `bun run auth:generate`, `bun run db:generate` and the relevant migration checks. Update the alternate SQLite schema and migrations through their generators:

```sh
node packages/mystack/scripts/generate-auth-schema.mjs
bun x drizzle-kit generate --config packages/mystack/assets/drizzle.config.ts
```

Keep platform SQLite tables in `assets/platform.sqlite.schema.ts`; never hand-edit generated auth schema. PostgreSQL uses RLS and transactional fulfillment hooks. SQLite uses explicit ownership checks and durable `purchase_delivery` events; retain the actual database harnesses when adding variants.

## Validate

```sh
bun run check
bun run typecheck
bun run test:cli
bun run --cwd packages/mystack test:generated
bun run --cwd packages/mystack test:packed
```

`test:cli` covers the 208 valid selections, flag constraints and filesystem safety. `test:generated` installs, checks, typechecks, tests and builds all 13 database/runtime/email tuples with all payments. You can narrow it during development, for example `bun run --cwd packages/mystack test:generated bun-sqlite bun resend`. PostgreSQL integration tests need Docker. D1 tests use workerd, local/Turso service tests use isolated libSQL, and native Bun SQLite database tests run with `bun test` after Vitest.

`test:packed` installs a tarball and creates an application outside this checkout. CI runs both the reference application's checks and the generator checks. Add or move routes in the reference application with `bun run generate-routes` and commit the route tree.

## Package a CLI release

```sh
bun install --cwd packages/mystack --frozen-lockfile
npm pack ./packages/mystack
```

For version `0.1.0`, the output is `0x0501-mystack-0.1.0.tgz`; a version change changes the filename. Use this artifact for local package verification. Public application users run `bunx @0x0501/mystack@latest` or `bunx @0x0501/mystack@latest create my-app`. The package works without a checkout or fetching a moving branch.

The personal npm account `0x0501` owns the package. Follow [publishing.md](./publishing.md) to bootstrap it, configure GitHub Actions trusted publishing and release matching `v*` tags. Packaging locally does not publish the CLI.
