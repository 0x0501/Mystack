# Mystack / TanStack Starter docs

New application users start with Mystack. Contributor guides explain how the CLI and its single runnable reference template are maintained. Use glossary terms in specs, issues, and code.

| Doc | Purpose |
|---|---|
| [`getting-started.md`](./getting-started.md) | Install Mystack, select configuration, create and run a project |
| [`project-guide.md`](./project-guide.md) | Develop and deploy a generated application; bundled in generated projects |
| [`contributing.md`](./contributing.md) | Maintain the generator and package CLI releases |
| [`publishing.md`](./publishing.md) | Configure the personal npm account and publish release tags with GitHub Actions |
| [`reference-template.md`](./reference-template.md) | Maintainers' setup for the root PostgreSQL / Workers reference application |
| [`research/tanstack-cli-generation.md`](./research/tanstack-cli-generation.md) | Source-backed comparison with TanStack CLI composition |
| [`research/npm-publishing.md`](./research/npm-publishing.md) | Official package naming, Bunx and trusted publishing requirements |
| [`../DESIGN.md`](../DESIGN.md) | Headless design, styling ownership, customization, motion, references |
| [`../CONTEXT.md`](../CONTEXT.md) | Ubiquitous language (glossary + invariants) |
| [`adr/`](./adr/) | Architectural decision records |
| [`specs/`](./specs/) | Implementation specs (PRD-style) |

## ADRs

| ADR | Title |
|---|---|
| [0001](./adr/0001-platform-only-generic-saas-starter.md) | Platform-only generic SaaS starter (+ extraction fidelity) |
| [0002](./adr/0002-oauth-issuer-always-on.md) | OAuth/OIDC issuer always on (+ metadata & search integrity) |
| [0003](./adr/0003-admin-roles-peer-protection-and-user-role-source-of-truth.md) | Admin roles, peer protection, `user.role` source of truth |
| [0004](./adr/0004-purchase-hook-not-wallet-or-subscription.md) | Purchase adapters + paid hook (no wallet/subscription product) |
| [0005](./adr/0005-full-app-i18n-url-and-user-locale.md) | Full-app i18n: URL prefixes (all HTML) + allowlist + `user.locale` |
| [0006](./adr/0006-postgres-hyperdrive-and-rls-skeleton.md) | PostgreSQL / Hyperdrive reference configuration and RLS |
| [0007](./adr/0007-base-ui-and-structural-shell.md) | Headless Base UI + replaceable presentation and motion |
| [0008](./adr/0008-hardened-account-security-core.md) | Hardened account-security core |
| [0009](./adr/0009-cloudflare-email-only.md) | Cloudflare Email reference configuration |
| [0010](./adr/0010-request-pipeline-load-bearing-contracts.md) | Request pipeline load-bearing contracts |
| [0011](./adr/0011-platform-hygiene-and-pinned-toolchain.md) | Platform hygiene scripts and pinned toolchain |
| [0012](./adr/0012-mystack-project-generation.md) | Mystack creation entry point, canonical template source and generated variants |

## Specs

| Spec | Title |
|---|---|
| [2026-08-01-platform-capabilities.md](./specs/2026-08-01-platform-capabilities.md) | Platform capabilities baseline (catalog) |
| [2026-08-02-platform-alignment-extraction.md](./specs/2026-08-02-platform-alignment-extraction.md) | **Alignment remediation** — extract, don’t invent (historical remediation; UI policy amended) |

## Notes

- These docs are public. Generated applications receive only `project-guide.md`; generator tutorials and maintenance decisions stay in this repository. Keep docs free of private product names, internal monorepo paths, and non-public operational detail.
- ADR 0012 is the current project creation policy. Historical specs describing clones or a single database/email/runtime configuration describe the original reference baseline.
- Platform work follows **extraction fidelity** (`CONTEXT.md`): strip product domain from proven patterns; do not invent parallel pipeline/i18n semantics. Presentation follows Headless design.
- Current UI policy: `DESIGN.md` + amended ADR 0007. Earlier alignment restrictions do not prescribe a visual style or forbid motion.
