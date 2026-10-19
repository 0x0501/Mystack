# Admin roles: peer protection; `user.role` is the only source of truth

## Status

Accepted — 2026-08-01; amended 2026-10-19 to use one administrator role.

## Context

Dual sources of “who is admin” (a private membership table *and* Better Auth `user.role`) drift: RLS `is_admin()` can disagree with the UI, so a promoted admin still fails policies. Duplicate administrator labels add no capability distinction. Administrators can demote or ban peers unless peer-protection guards exist. Better Auth’s own `/admin/*` HTTP routes only check plugin permissions and bypass app-level guards.

## Decision

1. Roles are **`user` | `admin`** on Better Auth’s **`user.role` only**. No separate admin membership table. No dual-write.
2. **`admin` is the sole administrator role.** No aliases or higher privilege tiers.
3. **Peer protection:** no administrator may ban, demote, or revoke credentials of an `admin`, nor change their own role. Last-admin safeguards apply where relevant.
4. **Bootstrap:** first Admin is granted by **operator SQL** (`UPDATE "user" SET role = 'admin' WHERE email = …`) — not env auto-promote, not first-user-wins.
5. Better Auth **admin plugin HTTP routes are disabled** at the router; admin operations go through server functions that call `auth.api.*` and enforce peer protection.

## Consequences

- RLS `is_admin()` (or equivalent) must read `user.role` for `admin`.
- Tests must assert disabled admin HTTP surface and peer-protection behavior.
- Promoting Admin is an ops procedure documented in the README, not an open signup path.
