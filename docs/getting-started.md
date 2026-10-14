# Create a project with Mystack

Every new application starts with `mystack create`. The starter repository is the source for maintainers; you work in the generated application and follow its README for the configuration you selected.

## Install the CLI

You need Node.js 22.12+ to run Mystack and Bun to install and run generated applications. PostgreSQL local development also needs Docker. Cloudflare deployments need a Cloudflare account; local Bun SQLite and libSQL development need no cloud database account.

The public `@mystack/cli` npm package is not available yet. Obtain the packaged CLI tarball from a maintainer and install it:

```sh
npm install --global ./mystack-cli-0.1.0.tgz
mystack --help
```

The tarball bundles the template and configuration adapters. Creating a project does not fetch a Git branch or need a starter checkout. Maintainers can build the release using [contributing.md](./contributing.md#package-a-cli-release).

## Use the wizard

```sh
mystack create my-app
```

Choose a database, deployment runtime, email transport and payment providers. Use the arrow keys to navigate, Space to toggle payment providers and Enter to confirm. An empty payment selection means none. Review the configuration summary before creation. Ctrl-C or Escape cancels configuration.

The name must start with a lowercase letter and contain at most 58 lowercase letters, digits or hyphens. The destination directory must not exist. Run the command from the directory where the new application should be created.

| Database flag | Supported runtimes | Setup before development |
|---|---|---|
| `pg` | `nitro`, `bun` | Docker PostgreSQL; app-role `DATABASE_URL` and privileged `DATABASE_MIGRATION_URL` |
| `pg-hyperdrive` | `cloudflare` | Docker PostgreSQL; local Hyperdrive connection in `wrangler.jsonc`; privileged migration URL |
| `d1` | `cloudflare` | Local D1 through Wrangler; no hosted database needed for local migrations |
| `turso-cloud` | All | Remote `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` |
| `turso-local` | `nitro`, `bun` | `TURSO_DATABASE_URL=file:local.db` |
| `bun-sqlite` | `bun` | `SQLITE_DATABASE_PATH=local.db` |

Cloudflare Email requires `cloudflare`; use Resend for Nitro or Bun. Only PostgreSQL variants include PostgreSQL RLS. SQLite variants use server authorization and explicit ownership predicates.

## Use flags in automation

`--yes` skips prompts. Specify all four categories to make your choice explicit. Without a category flag, Mystack chooses its default if compatible, otherwise the first compatible choice. Default payments are Stripe; pass `--payments none` to omit payments. Flags use the wizard's compatibility rules.

```sh
mystack create local-app --yes --database bun-sqlite --deployment bun --email resend --payments none
mystack create workers-app --yes --database d1 --deployment cloudflare --email resend --payments stripe,polar
mystack create server-app --yes --database pg --deployment nitro --email resend --payments stripe
```

Add `--no-install` to generate files without running `bun install`. If installation fails, the generated application is retained; enter its directory and retry `bun install`.

## Start the generated application

Enter the new project and copy its environment example:

```sh
cd local-app
# Run bun install here if installation was skipped or failed.
cp .env.example .env
```

Configure the selected database and provider credentials in `.env`. For PostgreSQL, the example includes matching local Docker credentials; start it before migrating:

```sh
# PostgreSQL variants only:
bun run db:up
```

All configurations ship initial migrations. Apply them and start development:

```sh
bun run db:migrate
bun run dev
```

Open **http://localhost:3000**, matching the example origins. Authentication email is logged in development when mail credentials are absent. PostgreSQL projects can run `bun run db:seed` for local test users; SQLite projects start with normal sign-up and their development email.

The generated README describes your database and deployment. Its [project guide](./project-guide.md) covers application structure, customization and validation. `mystack.json` records the creation choices; changing it alone does not regenerate or convert an existing project.

## Deploy

Set a fresh `BETTER_AUTH_SECRET`, real app/auth origins, verified email sender and selected provider credentials. Register only the selected payment webhook URLs and configure their signature secrets. Replace local database credentials with production credentials.

For Workers, provision the selected Hyperdrive or D1 resource, replace its placeholder ID in `wrangler.jsonc`, and configure the email binding if selected. Authenticate with `bunx wrangler login`. D1 projects apply hosted migrations using `bun run db:migrate:remote`; PostgreSQL and Turso Cloud use `bun run db:migrate` with production migration credentials. Create `.env.prod` and run `bun run deploy`.

Migration commands do not automatically read `.env.prod`. PostgreSQL migration tooling loads `.env` and `.env.local` (which overrides existing values); Turso/Bun migration scripts use the process environment (Bun also loads `.env`). Configure the migration environment for the production target before running the command. `bun run deploy` does not apply migrations.

For Nitro or Bun, inject the production environment in your host, apply migrations against the production database, run `bun run deploy` for production validation and build checks, then `bun run start`. Local libSQL and Bun SQLite deployments need persistent storage for the database file and its sidecars.

Resource creation and hosting remain with the project owner. Follow the generated README and scripts for your exact configuration.
