# TanStack CLI project generation

**Date:** 2026-10-13

**Scope:** TanStack CLI's generation architecture and its implications for Mystack and this repository's source layout.

**Source snapshot:** [`TanStack/cli@3f2d3d3`](https://github.com/TanStack/cli/tree/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591). All source links below refer to this commit.

## Findings

TanStack CLI composes base files, optional add-on files, EJS rendering and structured package metadata. It supports file replacement, text appending and configuration branches in templates. It does not maintain a complete application for every selection or use a general AST merger. Generation writes the base files, overlays add-ons and the user template, then generates `package.json`. See the [generation order](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/create-app.ts#L66-L149) and [file renderer](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/template-file.ts#L119-L218).

**Recommendation for this repository: keep the runnable root application as the single source of truth.** Mystack's packaged template is a build artifact generated from that source. A second application in `templates/default/` or `examples/` would add another maintenance target. Application users should create projects with `mystack create`; checkout instructions belong in contributor documentation. This recommendation follows this repository's needs, rather than prescribing TanStack CLI's directory layout.

## Components of the official design

| Layer | Responsibility | Official evidence |
|---|---|---|
| CLI | Commands, flags and interaction; the public creation command is `tanstack create` | [CLI reference](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/docs/cli-reference.md) |
| `@tanstack/create` | Generation engine coordinating file rendering, environment output and installation | [createApp](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/create-app.ts#L478-L490) |
| Framework base | React or Solid project files and optional dependency groups | [scanProjectDirectory](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks.ts#L15-L47) |
| Add-on | Metadata, dependencies, assets, options and integration declarations such as providers or Vite plugins | [scanAddOnDirectories](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks.ts#L49-L129), [authoring guide](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/docs/creating-add-ons.md) |
| User template | Reusable project customizations with metadata, dependency declarations and file changes relative to a generated baseline | [compileStarter](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/custom-add-ons/starter.ts#L66-L119), [template guide](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/docs/templates.md) |

The official `ARCHITECTURE.md` still describes a Starter as a configuration-only add-on preset and uses the older `starter` command name. Current user documentation calls it a template; internal source retains the `Starter` name, and `StarterCompiledSchema` includes `files` and `deletedFiles`. The implementation and current template documentation are the relevant references. See the [older architecture description](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/ARCHITECTURE.md#L3-L19) and [current schema](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/types.ts#L128-L138).

## How configuration changes the output

### Files and dependencies

Ordinary files are written to the destination, so later file packages can replace earlier files at the same path. `.ejs` files are rendered and lose that extension; `.append` files append to their destination; `_dot_` names become dotfiles. A template can call `ignoreFile()` to omit a file. The EJS context includes `addOnEnabled`, `addOnOption`, `integrations`, `routes` and project options. See the [renderer implementation](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/template-file.ts#L50-L218).

`package.json` is composed by field. `dependencies`, `devDependencies` and `scripts` are overlaid by key, with the overlay taking precedence; `pnpm.onlyBuiltDependencies` becomes a deduplicated union. Add-ons can use `package.json.ejs` to select dependencies through options. See the [merge implementation](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/package-json.ts#L6-L57) and [Drizzle dependency template](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/add-ons/drizzle/package.json.ejs).

### Explicit insertion points in shared files

The base `vite.config.ts.ejs` collects integrations whose type is `vite-plugin`, then generates their imports and `plugins` entries. The Cloudflare add-on declares its import and `cloudflare(...)` expression. The base template also has direct conditional branches for Paraglide, React Compiler and other options. See the [base Vite template](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/project/base/vite.config.ts.ejs) and [Cloudflare integration](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/hosts/cloudflare/info.json).

Drizzle selects its database driver through EJS branches in `src/db/index.ts.ejs`, producing an ordinary TypeScript file. Both this approach and Mystack generate code according to selected options; the main difference is whether the template explicitly declares where those variations occur. See the [Drizzle source template](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/add-ons/drizzle/assets/src/db/index.ts.ejs).

### Runnable projects and distributed templates

The official workflow starts with creating and modifying a real project, then running `tanstack template init` and `tanstack template compile`. The compiler reconstructs the same-configuration baseline in memory, collects changed and deleted files, and writes `template.json`. Maintainers develop in a runnable application and distribute a compiled file package. See the [authoring workflow](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/docs/templates.md), [baseline reconstruction](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/custom-add-ons/shared.ts#L111-L151) and [template compiler](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/custom-add-ons/starter.ts#L97-L119).

Mystack can preserve the same separation by packaging this repository's single application source. It does not need TanStack CLI's differential JSON format to do so.

### Adding features to existing projects

`tanstack add` is not a general semantic merger for arbitrary source code. It identifies existing files with different contents as overwrites and requests confirmation when needed. Environment files have dedicated key merging, `package.json` uses field merging, and other files are written from generated content. This behavior differs from initial project creation. See the [existing-project writer](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/add-to-app.ts#L142-L265).

## What the official directory layout represents

Each framework contains `project/base/`, `add-ons/`, `toolchains/`, `hosts/` and `examples/`. React's registration code scans these directories explicitly. This layout manages multiple frameworks and capability packages. See the [directory registration](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/index.ts).

The `examples/` directory contains capability packages with `type: "example"`. For instance, Events includes routes, assets, dependencies and integrations that participate in generation. These examples serve a different purpose from the temporary projects used by Mystack's verification scripts. See the [Events metadata](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/examples/events/info.json).

For this repository:

- Keep the root application responsible for development and platform behavior checks. Generate Mystack's template artifact during CLI packaging.
- Add `examples/` when there is an independently useful demonstration to maintain. Generate verification projects in temporary directories.
- Introduce a separate template source layout when distinct templates justify it. Move the canonical source and update its tooling paths together; avoid maintaining duplicate full applications.

## Practices Mystack can adopt

These recommendations are architectural judgments based on the official implementation:

1. **Prefer complete files.** Add, replace or remove independent integration files according to the selected option. Modify dependencies and JSON configuration as structured data.
2. **Keep bounded source transformations where they fit.** Small changes with unique anchors, explicit failures for absent or ambiguous matches, and validation of generated behavior can remain maintainable. Adopting EJS everywhere is not necessary to follow the official design.
3. **Define insertion points when shared files become complex.** Repeated changes to imports, providers or plugins should use deliberate generation interfaces when actual composition needs justify them.
4. **Release the template, CLI and verification together.** Generate projects from the final installed package and validate their behavior so users receive the artifact maintainers checked.
5. **Use Mystack as the creation entry point.** User tutorials start with installing a release and running `mystack create`, followed by work inside the generated project. Contributor guidance covers checkout, template preparation and release packaging.

These choices preserve a runnable platform source and clear ownership of integration files, shared generation points and release artifacts.
