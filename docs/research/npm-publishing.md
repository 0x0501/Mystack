# Mystack npm publishing

**Date:** 2026-10-13

**Scope:** Package naming, Bunx execution, and automatic npm releases from GitHub tags.

## Package name and invocation

An npm package under the `0x0501` scope is named `@0x0501/mystack`. A specifier such as `0x0501/mystack` is GitHub repository shorthand. The npm account or organization must own the selected scope; matching a GitHub username does not establish npm ownership. See [npm package specifiers](https://docs.npmjs.com/cli/v11/using-npm/package-spec/) and [scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

Bunx installs and executes npm package binaries. With the package's `mystack` binary, the public creation command is:

```sh
bunx @0x0501/mystack@latest create my-app
```

The explicit equivalent is `bunx --package @0x0501/mystack@latest mystack create my-app`. Bunx respects a Node shebang by default, so the CLI's declared Node requirement still applies. See [Bunx](https://bun.sh/docs/pm/bunx).

## Recommended publishing mechanism

Use npm trusted publishing with GitHub Actions OIDC. It requires npm 11.5.1 or newer, Node 22.14 or newer, a GitHub-hosted runner, and `id-token: write`. Ongoing releases need no npm token. Public packages from public repositories receive provenance automatically. The package's `repository.url` must match the actual GitHub repository. See [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/).

Use Node 24 in the release job and set `package-manager-cache: false` in `actions/setup-node`. OIDC does not need `NODE_AUTH_TOKEN`. Bun can install the repository dependencies while npm performs publication. See the [official setup-node publishing example](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md#publishing-to-npm-with-trusted-publisher-oidc).

## Initial setup

The package must already exist before its trusted publisher can be configured. Perform one account-authenticated publication first. Direct publication requires account 2FA or a granular access token with 2FA bypass. Scoped public packages require `--access public`. See [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/) and [publishing scoped packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

Publishing `0.1.0` during this setup consumes that version. To let the first automated release publish `0.1.0`, the bootstrap publication can use a temporary prerelease version and a separate distribution tag. This is a repository release choice; npm does not permit reusing a published name and version. See [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/).

Configure these values in the package's npm settings:

| Setting | Value |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `0x0501` |
| Repository | `tanstack-starter` |
| Workflow filename | `publish-mystack.yml` |
| Environment | Empty |
| Allowed actions | Enable direct publication with `npm publish` |

New configurations default to staged publication. Complete a successful OIDC publication within two days of creating the trust configuration; otherwise recreate it. After setup, package publishing access can require 2FA and disallow traditional tokens while OIDC continues working. See [trusted publisher configuration](https://docs.npmjs.com/trusted-publishers/).

## Tag releases

Configure `push.tags: ["v*"]` to run on pushed release tags. A local tag alone does not trigger GitHub Actions. See [GitHub workflow tag filters](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushbranchestagsbranches-ignoretags-ignore).

The workflow should validate that the tag's version matches `packages/mystack/package.json`, prepare and verify the final tarball, and publish that artifact. Stable versions should use the `latest` distribution tag; prereleases should use a separate tag such as `next`. These are release policies for this repository. npm's `--tag` option selects the distribution tag, and each published version is immutable. See [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/).
