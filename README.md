# Mystack / TanStack Starter

Create a configured TanStack Start application with **Mystack**. Projects include Better Auth (OAuth/OIDC issuer, 2FA and passkeys), user and admin flows, optional payments, full-app i18n and replaceable Base UI presentation.

**Use `mystack create` to start every new project.** This repository maintains the CLI and its reference template; product development happens in the generated project.

## Create your project

Install Node.js 22.12+ and [Bun](https://bun.sh). Install the CLI release tarball provided by a maintainer, then run the wizard:

```sh
npm install --global ./mystack-cli-0.1.0.tgz
mystack create my-app
cd my-app
```

The public npm package is not available yet. Until it is published, use a packaged CLI release. Maintainers build that artifact using the [contributor guide](./docs/contributing.md#package-a-cli-release).

Follow the generated `README.md` to configure `.env`, apply migrations and start the app. Mystack installs dependencies unless you decline in the wizard or pass `--no-install`.

For a local Bun application without cloud database credentials:

```sh
mystack create my-app --yes --database bun-sqlite --deployment bun --email resend --payments none
cd my-app
cp .env.example .env
bun run db:migrate
bun run dev
```

Open **http://localhost:3000**. Development logs authentication email when mail credentials are absent. Production needs a verified sender and the selected provider's credentials.

See the [getting started tutorial](./docs/getting-started.md) for the wizard, flags, database setup and deployment.

## Configuration

| Category | Choices |
|---|---|
| Database | PostgreSQL (`pg`), PostgreSQL + Hyperdrive (`pg-hyperdrive`), D1 (`d1`), Turso Cloud (`turso-cloud`), local libSQL (`turso-local`), Bun SQLite (`bun-sqlite`) |
| Runtime | Cloudflare Workers (`cloudflare`), Nitro / Node.js (`nitro`), native Bun (`bun`) |
| Email | Cloudflare Email (`cloudflare`), Resend (`resend`) |
| Payments | Stripe, Creem, NOWPayments, Polar; any subset or `none` |

The default is PostgreSQL + Hyperdrive, Workers, Cloudflare Email and Stripe. The wizard disables incompatible choices; flags enforce the same constraints. Configuration is recorded in the generated `mystack.json`.

## Repository ownership

| Path | Purpose |
|---|---|
| Root `src/`, `scripts/`, `drizzle/`, app config | Single runnable reference template, maintained and tested directly |
| `packages/mystack/src/` | CLI, option catalog and configuration adapters |
| `packages/mystack/assets/` | Alternative source files, schemas, migrations and database test harnesses |
| `packages/mystack/template/` | Ignored release snapshot, rebuilt by `prepack` |
| `docs/` | User tutorials, contributor guidance, decisions and research |

The root application is the canonical template source. See [ADR 0012](./docs/adr/0012-mystack-project-generation.md) for composition and the decision to keep one source instead of adding an `examples/` or duplicate `templates/default/` application.

## Documentation

- [Getting started](./docs/getting-started.md) — install Mystack and create a project
- [Project guide](./docs/project-guide.md) — work inside a generated project; also bundled with the CLI
- [Contributing](./docs/contributing.md) — maintain the template, adapters and CLI release
- [Reference template](./docs/reference-template.md) — maintainers' PostgreSQL / Workers setup
- [Design](./DESIGN.md) — Headless presentation and customization
- [Context](./CONTEXT.md) and [documentation index](./docs/README.md) — terminology and architecture
- [TanStack CLI research](./docs/research/tanstack-cli-generation.md) — official generator design and comparison

## License

See [LICENSE](./LICENSE).
