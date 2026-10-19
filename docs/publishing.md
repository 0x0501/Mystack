# Publish Mystack to npm and GitHub Releases

Mystack is published as the public package `@0x0501/mystack`, owned by the personal npm account `0x0501`. The GitHub repository is `0x0501/mystack`. After the first stable release, users can open the wizard with:

```sh
bunx @0x0501/mystack
bunx @0x0501/mystack@latest create my-app
```

## Release workflow

`.github/workflows/publish-mystack.yml` runs when a `v*` tag is pushed. It requires the tagged commit to be on `main` and the tag to equal `v` plus the version in `packages/mystack/package.json`. It calls the existing CI workflow before publishing: application checks, PostgreSQL tests, builds, generated-project verification and packaged CLI verification must all pass.

The publishing job uses a GitHub-hosted runner, Node 24, npm 11 and OIDC with `id-token: write`. `prepack` rebuilds the template snapshot. Every successful tag-triggered release updates the `latest` distribution tag to the published version, including prereleases, through `npm publish --tag latest`. No npm token or GitHub environment is used. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

After npm publication succeeds, a separate `github-release` job creates a GitHub Release for the same tag, titled `Mystack v<version>`. It uses GitHub's [automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes) to list merged pull requests, contributors and a link to the full changelog. Use descriptive PR titles so readers can understand what changed. Tags with a prerelease version, such as `v0.2.0-beta.1`, are marked as GitHub prereleases and do not replace the latest stable GitHub Release; the npm `latest` behavior above is unchanged.

Only this Release job receives `contents: write`, using the built-in `GITHUB_TOKEN`; no extra secret is needed. An existing Release is left intact when the job is rerun, preserving any manually edited notes.

## Set up the personal npm account once

Use the npm account `0x0501` and enable account 2FA. A personal user scope is available with that account; no npm organization is required. Public scoped packages use `--access public`. See [npm scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

Merge the release workflow and package changes into `main` first. In an up-to-date checkout, install the CLI dependencies:

```sh
bun install --cwd packages/mystack --frozen-lockfile
```

npm requires the package to exist before configuring its trusted publisher. Publish a bootstrap prerelease through your own account so `0.1.0` remains available for the first automated stable release. Use Node 24 and npm 11 for these commands:

```sh
cd packages/mystack
npm login --registry=https://registry.npmjs.org
npm whoami --registry=https://registry.npmjs.org
# The account above must be 0x0501.
npm version 0.1.0-bootstrap.0 --no-git-tag-version
npm publish --access public --tag bootstrap
npm version 0.1.0 --no-git-tag-version
cd ../..
```

Restore the package version to `0.1.0` even if the bootstrap publication fails. Do not commit or tag the bootstrap version. The bootstrap command runs `prepack`, so it publishes the complete CLI and template. It uses your local npm login and 2FA; no registry publication is performed by repository setup scripts.

In npm, open the `@0x0501/mystack` package, select **Settings → Trusted publishing → GitHub Actions**, and configure:

| Field | Value |
|---|---|
| Organization or user | `0x0501` |
| Repository | `mystack` |
| Workflow filename | `publish-mystack.yml` |
| Environment name | Leave empty |
| Allowed actions | Enable `npm publish` |

The workflow filename is the file name alone, without `.github/workflows/`. New publisher configurations default to staged publishing; this workflow needs direct publication enabled. Complete the first successful OIDC release within two days of configuring trust, or recreate the expired configuration. See [npm publisher settings](https://docs.npmjs.com/trusted-publishers/).

GitHub Actions must be enabled for the repository. The workflow declares its OIDC permission directly; you do not need `NPM_TOKEN`, `NODE_AUTH_TOKEN`, repository secrets or an environment approval rule.

## Publish version 0.1.0

After account setup, from `main` with package version `0.1.0`:

```sh
git pull --ff-only origin main
git tag v0.1.0
git push origin v0.1.0
```

Follow **Actions → Publish Mystack**. Once it succeeds:

```sh
npm view @0x0501/mystack version
bunx @0x0501/mystack@latest create my-app
```

Open the repository's **Releases** page to read the automatically published update notes.

## Publish subsequent versions

Update `packages/mystack/package.json`, commit the version change and merge it into `main`. For example:

```sh
npm version 0.1.1 --no-git-tag-version --prefix packages/mystack
git add packages/mystack/package.json
git commit -m "chore(mystack): release 0.1.1"
git push origin main
git tag v0.1.1
git push origin v0.1.1
```

If `main` requires pull requests, submit the version commit through a PR and tag the merged commit. A prerelease such as `0.2.0-beta.1` uses the matching `v0.2.0-beta.1` tag and also becomes `latest`.

Published versions are immutable. A failed run before publication can be retried after correcting configuration. If npm publication succeeds but `github-release` fails, use **Re-run failed jobs** in GitHub Actions to retry only Release creation; do not rerun the successful npm job. For package changes after publication, release a new version instead of moving or reusing its tag. See [npm versioning and publication](https://docs.npmjs.com/cli/v11/commands/npm-publish/).
