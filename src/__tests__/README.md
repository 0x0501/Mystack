# Tests

Application and CLI Vitest tests live here (`*.test.ts` / `*.test.tsx`). Browser tests live in `e2e/`; database/provider test assets for generated projects live in `packages/mystack/assets/`.

Test observable behavior: authorization refusals, state changes, transaction rollback, payment idempotency, protocol round-trips, routing, rendering and filesystem safety. Use real database/runtime tests where the driver behavior matters.

Do not test README wording, copied constant values, export existence, source formatting or third-party library defaults. Remove duplicate assertions when a retained test exercises the same behavior. A test must invoke the behavior its name claims to cover.

Run `bun run test` with Docker for the complete application suite, or `bun run test:unit` without database integration. `bun run test:e2e` runs Playwright. In the generator repository, `bun run test:cli` runs CLI tests; generated-project and packaged-CLI verification are documented in `docs/contributing.md`.
