# Reference template maintenance

A Headless SaaS starter for **TanStack Start** on **Cloudflare Workers**: hardened Better Auth, roles with peer protection, Postgres + Hyperdrive + RLS skeleton, Cloudflare Email, Turnstile, optional payment adapters (Purchase + purchase-paid hook), user dashboard, and admin console.

This page is for maintainers working on the runnable reference application at the repository root. All paths and commands below are relative to that root. To create a product, use [Mystack](./getting-started.md); generated projects have their own configuration-specific README.

The reference configuration is PostgreSQL + Hyperdrive, Workers and Cloudflare Email. Mystack adapters generate other supported configurations from this single source. See [the contributor guide](./contributing.md) for CLI development and release packaging.

## Prerequisites

- [Bun](https://bun.sh)
- [Docker](https://docs.docker.com/get-docker/) (local Postgres via Compose)
- Cloudflare account (Email binding, Hyperdrive, Turnstile for production)

## Run the reference application

```bash
bun install
bun install --cwd packages/mystack
cp .env.example .env
# Boots as-is: .env.example ships a dev-only BETTER_AUTH_SECRET placeholder.
# Add social/payment keys as needed; `bun run validate-prod-env` refuses the
# placeholder, so a deploy can never inherit it.
bun run db:up          # Postgres 17 + starter_app role (.env.docker)
bun run db:migrate     # drizzle migrations via DATABASE_MIGRATION_URL
bun run db:seed        # local admin + user (optional)
bun run dev
```

Open **http://localhost:3000** (not `127.0.0.1` — cookie/origin config is for `localhost`).

## Headless UI and customization

Auth, account, and admin flows work out of the box. Base UI owns composite interactions; the default theme and layout are replaceable. No visual style or animation approach is mandatory.

- `src/styles/theme.css`: light/dark palette, typography, radii, and Tailwind token mappings.
- `src/styles/ui.css`: opt-in control styling and default menu/select motion.
- `src/styles/layout.css`: page widths and shell layouts; shells also accept `className` and div props.
- `src/hooks/use-theme.ts`: theme behavior for a custom control.

Compose Base UI directly for new controls. Override defaults with Tailwind utilities or replace the CSS imports in `src/styles.css`. CSS animations and libraries such as Motion/GSAP are allowed, with reduced-motion treatment per component. See [DESIGN.md](../DESIGN.md) for customization examples and the reviewed starter references.

## Database (Postgres + Hyperdrive)

### Local Docker

Defaults live in **`.env.docker`** (committed, dev-only) and are mirrored in **`.env.example`**.

| | Value |
|--|--|
| Database | `starter` |
| Superuser | `postgres` / `postgres_dev_password` → `DATABASE_MIGRATION_URL` |
| App role | `starter_app` / `starter_app_dev_password` → Hyperdrive local |

```bash
bun run db:up       # docker compose --env-file .env.docker up -d
bun run db:down     # stop
bun run db:reset    # wipe volume + recreate (destroys local data)
bun run db:migrate
bun run db:seed
```

`scripts/postgres/create-app-role.sh` runs on **first** container init and creates the `starter_app` role (`NOBYPASSRLS`). Drizzle migration `0000_create-app-role.sql` is idempotent for hosted DBs where Docker never ran.

### Migrations & Hyperdrive

1. Apply migrations with the **privileged** URL in `.env` (never the app role):

   ```bash
   # Already set in .env.example for Docker:
   # DATABASE_MIGRATION_URL=postgresql://postgres:postgres_dev_password@localhost:5432/starter
   bun run db:migrate
   ```

2. Generate table migrations after schema changes:

   ```bash
   bun run db:generate
   bun run db:migrate
   ```

3. Runtime access always goes through the **`HYPERDRIVE`** binding in `wrangler.jsonc`. Local `vite dev` uses `hyperdrive[].localConnectionString` (app role). Production: set a real Hyperdrive config id and a strong app-role password.

`drizzle.config.ts` loads `.env` then `.env.local` (override) for `DATABASE_MIGRATION_URL`.

### Local seed users

After migrations, seed an **admin** and a **user** (verified email/password) for local sign-in:

```bash
bun run db:seed
# or: bun run seed:local
# bun run db:seed -- --admin-only
# bun run db:seed -- --user-only
```

Defaults (override with `SEED_*` env vars — see `.env.example`):

| Role | Email | Password |
|------|--------|----------|
| `admin` | `admin@localhost.dev` | `AdminPass1!` |
| `user` | `user@localhost.dev` | `UserPass1!` |

Idempotent: re-running updates role, name, verified flag, and password hash. Refuses non-local `DATABASE_MIGRATION_URL` unless `SEED_FORCE=1`.

### First Admin (production / shared DB)

There is **no** env auto-promotion. After you have a normal user row, promote with SQL:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';
```

Roles: `user` | `admin`. Admin is the sole administrator role, with peer protection.

## Auth

- Email/password, optional GitHub, 2FA, passkey, OAuth/OIDC **issuer** (always on).
- Dangerous Better Auth HTTP routes are in `DISABLED_AUTH_PATHS` (`src/lib/auth-paths.ts`); server-side `auth.api.*` still works.
- Turnstile: set `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` in production; leave blank in dev to disable captcha.
- Email: Cloudflare `send_email` binding `EMAIL`; brand display name from `EMAIL_FROM_NAME`.

```bash
bun run auth:generate   # after changing plugins in src/lib/auth.ts
```

## Routes

| Path | Purpose |
|------|---------|
| `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/two-factor` | Auth chrome |
| `/oauth/consent` | OAuth issuer consent |
| `/dashboard`, `/dashboard/account` | User shell |
| `/admin/users`, `/admin/audit`, `/admin/oauth-apps` | Admin console |

### Navigation and session caching

SSR handles the initial request; subsequent navigation runs `beforeLoad` and loaders in the browser. The root guard uses a per-router TanStack Query session cache (`sessionQueryOptions`, 30 seconds), so intent preloads and navigation share requests. Expired or invalidated sessions are checked before child guards run. Each SSR request gets a separate QueryClient, and SSR query data is hydrated into the browser cache.

Query results stay fresh for 30 seconds by default, avoiding immediate duplicate fetches after SSR, preloading, or a loader. Override `staleTime` per query when needed. Slow loaders show `RoutePending` after 150ms with no forced minimum delay; `NavigationProgress` covers waits in `beforeLoad` before the next page's pending boundary is available. Both use the localized `common_loading` message and replaceable presentation.

Better Auth's production cookie cache lasts **360 seconds (6 minutes)**; it is disabled in dev. This saves server database reads and is separate from the browser query cache. Server authorization and sensitive-operation checks remain in the server functions.

After changing authentication state without a full page reload, invalidate the session query before rerunning route guards:

```tsx
import { sessionQueryOptions } from "@/integrations/better-auth/session-query";

await queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey });
await router.invalidate();
```

The account page does this after profile/security changes. Sign-in and sign-out use full page navigation, which starts a new cache.

## Payments (optional)

Stripe / Creem / NowPayments adapters map to a platform **Purchase** row and call the **purchase-paid hook** once. No wallet or subscription product. Disable rails server-side via payment method toggles (admin tools strip — not a fourth nav item).

## Tests

```bash
bun run test
```

Requires **Docker** (Testcontainers starts Postgres for the suite). Unit seams use temp tables as superuser; RLS policy tests migrate into a dedicated `rls_test` database and connect as the real `starter_app` role (NOBYPASSRLS).

Browser checks cover default and custom presentation, popup motion, locale links, and responsive layouts. To include authenticated hydration and account-control checks, seed a local user, start the app on its configured origin, and pass that user's credentials:

```bash
bun run db:seed
bun run dev
# In another terminal, after setting E2E_USER_EMAIL and E2E_USER_PASSWORD:
E2E_BASE_URL=http://localhost:3000 bun run test:e2e
```

Without those credentials, only the authenticated browser test is skipped.

Seams under test:

| Seam | Coverage |
|------|----------|
| Disabled auth HTTP paths | **Measured** plugin mounts + HTTP 404 surface |
| Account security | GitHub gate + OTP/2FA, session eviction, replay and cooldown behavior |
| Admin security | Peer matrix + **DB last-admin** counts |
| Purchase fulfillment | Idempotent mark-paid + hook once + rollback/retry against PostgreSQL |
| Webhook body-limit + signature | body-limit + payments-verify |
| RLS helpers / policies | **admin_action** policy integration as the real application role |

Bootstrap SQL in `drizzle/0000`–`0002` is the fresh-project path (`db:migrate` without a generate step). `0002` contains generated table/policy DDL and has a matching Drizzle snapshot; the required `is_admin()` function is placed before the policies that call it. After editing Drizzle schema, use `bun run db:generate`. The baseline targets fresh databases.

### Client-bundle check

After a production build, scan `dist/client` for server-only markers and secret values:

```bash
bun run build
bun run check:client-bundle
```

`bun run deploy` runs the client-bundle check after build.

### Product extensions

Generated projects add their own domain, visual identity, and locales. In-tree locales are en/de; wallets, marketplace providers, and consumer API-key products belong to the derived product.

## Scripts

| Command | What |
|---------|------|
| `bun run dev` | Dev server :3000 |
| `bun run build` | Production build |
| `bun run deploy` | `validate-prod-env` → prod build → client-bundle check → `wrangler deploy` |
| `bun run test` | Vitest (needs Docker) |
| `bun run test:unit` | Vitest without database seams |
| `bun run test:e2e` | Playwright |
| `bun run check` | Biome + raw-SQL and server-fn guardrails |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run db:up` / `db:down` / `db:reset` | Local Postgres container |
| `bun run db:generate` / `db:migrate` / `db:seed` | Drizzle |
| `bun run generate-routes` | After adding routes |

## Docs

- [DESIGN.md](../DESIGN.md) — Headless design, customization, motion, and references
- [CONTEXT.md](../CONTEXT.md) — glossary + invariants
- [adr/](./adr/) — architectural decisions
- [specs/2026-08-01-platform-capabilities.md](./specs/2026-08-01-platform-capabilities.md) — platform capabilities baseline

## License

See [LICENSE](../LICENSE).
