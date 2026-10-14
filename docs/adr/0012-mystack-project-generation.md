# Mystack is the project creation entry point

## Status

Accepted — 2026-10-13.

Amends ADR 0001's direct repository-cloning workflow and ADRs 0006/0009's restrictions on generated database/runtime/email choices. Their PostgreSQL RLS and Cloudflare Email contracts still apply to the reference configuration.

## Context

Mystack already generates six database choices, three runtimes, two email transports and any subset of four payment providers. Treating the repository as a user-facing application to clone bypasses that configuration and leaves two conflicting setup paths in the documentation.

TanStack CLI composes base assets, selected add-on assets and custom template assets, renders EJS and combines package metadata. Normal file collisions resolve through ordered writes; `.append` assets concatenate. Shared entry files expose deliberate insertion points. It is not a general AST merge system. See the official [creation pipeline](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/create-app.ts#L66-L149), [file renderer](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/template-file.ts#L119-L218) and [package metadata composition](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/package-json.ts#L6-L57). The [research note](../research/tanstack-cli-generation.md) records the full comparison.

Our root application is already runnable, tested and used as the template source. Moving it solely to rename the source directory would change the development and CI entry points without improving composition. Copying it into another directory would create competing sources.

## Decision

1. **New projects use `mystack create`.** User documentation starts with installing the packaged CLI. Checkout and root application setup belong to contributor documentation.
2. **Keep one canonical application source at the repository root.** It remains the PostgreSQL + Hyperdrive / Workers / Cloudflare Email reference configuration and is tested directly.
3. **Keep CLI ownership in `packages/mystack/`.** `src/catalog.mjs` owns choices and constraints; category adapters own source/dependency/script/env/resource changes; `assets/` owns alternate files and database fixtures.
4. **`packages/mystack/template/` is a generated release snapshot.** `prepack` rebuilds it from the allowlist. It is ignored by Git and never edited as source. Published CLI versions carry their own template snapshot.
5. **Compose a file map and structured metadata.** Apply deployment → database → email → payments, regenerate routes and format the generated project. Prefer complete alternate files for independent integrations. Keep shared source transformations explicit and checked; add deliberate insertion points when composition warrants them. Do not build a general plugin or AST framework for the current fixed choices.
6. **Do not add `examples/` or duplicate `templates/default/`.** An example needs an actual independently useful demonstration. A separate template source layout needs distinct maintained templates and a corresponding workspace/testing design; it should move the canonical source rather than copy it.
7. **Ship configuration-specific instructions.** Generated `README.md` contains the selected database/runtime setup. Bundle `docs/project-guide.md` for application development; keep generator tutorials, research and maintainer instructions outside generated applications. `mystack.json` records creation choices and is not a live reconfiguration API.
8. **Publish under the personal npm account `0x0501`.** The package is `@0x0501/mystack`; users run it through Bunx. Matching `v*` tags on `main` publish through GitHub Actions after CI passes, using npm trusted publishing. See [the publishing guide](../publishing.md).

## Consequences

- Application users need only the CLI release and their generated project's instructions.
- Contributors validate one runnable reference source and the supported generation matrix.
- Template layout and rendering mechanisms remain separate decisions; adding a folder does not improve source transformations by itself.
- PostgreSQL retains RLS and transactional paid hooks; SQLite variants enforce authorization with middleware/ownership predicates and atomically record durable delivery events.
- The former PostgreSQL-only and Cloudflare-Email-only rules describe the reference template, while the catalog defines supported generated variants.
- The initial npm publication registers the package before trusted publishing is configured. Subsequent releases use OIDC without a stored npm token.
