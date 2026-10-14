# TanStack CLI 项目生成设计

**日期：** 2026-10-13

**范围：** 官方 TanStack CLI 的生成架构，以及对 mystack 和本仓库源码组织的建议。
**源码快照：** [`TanStack/cli@3f2d3d3`](https://github.com/TanStack/cli/tree/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591)。本报告先浏览官方资料，再克隆并通过代码图定位、读取实现；以下源码链接固定到该 commit。

## 结论

TanStack CLI 采用基础文件包、可选 add-on 文件包、EJS 渲染和结构化依赖合并。它也会覆盖文件、追加文本，并在模板里处理配置分支，并没有为每种选项组合维护一套完整应用，也没有通过通用 AST 合并器改写所有源码。生成入口先写基础文件，再叠加 add-on 和用户模板，最后生成 `package.json`。[生成顺序](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/create-app.ts#L66-L149)、[文件渲染](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/template-file.ts#L119-L218)。

**对本仓库的建议：保留根目录这份可运行、可检查的应用作为唯一源码。** mystack 发布包中的模板是从这份源码生成的构建产物。现在无需添加 `templates/default/` 或 `examples/` 来复制应用；普通使用者通过 `mystack create` 创建项目，源码 checkout 的操作放进维护者文档。此处是针对本仓库范围的架构判断，下面的官方设计提供参考，而非要求采用同样的目录。

## 官方设计的组成

| 层 | 作用 | 官方证据 |
|---|---|---|
| CLI | 命令、参数、交互，公开入口是 `tanstack create` | [CLI reference](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/docs/cli-reference.md) |
| `@tanstack/create` | 生成引擎；把选项交给文件渲染、环境写入和后续安装步骤 | [createApp](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/create-app.ts#L478-L490) |
| Framework base | React / Solid 的基础工程文件和可选依赖组 | [scanProjectDirectory](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks.ts#L15-L47) |
| Add-on | 元数据、依赖、assets、配置选项，以及 provider / Vite plugin 等 integration 声明 | [scanAddOnDirectories](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks.ts#L49-L129)、[官方制作指南](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/docs/creating-add-ons.md) |
| 用户 Template | 可复用项目定制；包含元数据、依赖声明和相对生成基线的文件变化 | [compileStarter](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/custom-add-ons/starter.ts#L66-L119)、[模板指南](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/docs/templates.md) |

官方 `ARCHITECTURE.md` 仍把 Starter 描述为只含配置的 add-on preset，且使用旧 `starter` 命令名称。当前用户文档使用 `template`；源码内部仍保留 `Starter` 命名，`StarterCompiledSchema` 明确包含 `files` 和 `deletedFiles`。讨论当前设计时应以实现和当前模板文档为准，不能把“starter 只有配置”作为事实。[旧架构描述](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/ARCHITECTURE.md#L3-L19)、[当前类型](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/types.ts#L128-L138)。

## 不同配置如何改变输出

### 文件与依赖

普通文件直接写入目标，同名文件可以被后续文件包覆盖；`.ejs` 文件先渲染再去除扩展名；`.append` 文件追加到目标；`_dot_` 名称转为点文件；模板还能调用 `ignoreFile()` 跳过整个文件。EJS 上下文包括 `addOnEnabled`、`addOnOption`、`integrations`、`routes` 和项目选项。[实现](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/template-file.ts#L50-L218)。

`package.json` 则按字段处理：`dependencies`、`devDependencies`、`scripts` 逐键叠加，同键以 overlay 为准；`pnpm.onlyBuiltDependencies` 做去重并集。add-on 可使用 `package.json.ejs` 根据选项声明不同依赖。[合并实现](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/package-json.ts#L6-L57)、[Drizzle 依赖模板](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/add-ons/drizzle/package.json.ejs)。

### 共用入口的显式生成位置

基础 `vite.config.ts.ejs` 收集 `type === "vite-plugin"` 的 integration，分别生成 imports 与 `plugins` 数组项。Cloudflare add-on 声明所需的 import 和 `cloudflare(...)` 代码，因此无需在已生成的 Vite 文件里搜索某个旧片段再替换。基础模板也保留 Paraglide、React Compiler 等直接条件分支。[基础 Vite 模板](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/project/base/vite.config.ts.ejs)、[Cloudflare integration](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/hosts/cloudflare/info.json)。

Drizzle 的数据库选择也通过同一 `src/db/index.ts.ejs` 内的 EJS 条件选择 driver；输出是一份普通 TypeScript 文件。这证明“按选项生成不同代码”本身与 mystack 的配置变体一致，主要差别在于变化位置是否由模板明确表达。[Drizzle 源码模板](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/add-ons/drizzle/assets/src/db/index.ts.ejs)。

### 可运行项目与发布模板

官方推荐先创建并修改一个真实项目，再执行 `tanstack template init` / `compile`。编译器在内存中重建同配置基线，收集变化文件和删除文件，写进 `template.json`。因此维护者可以在真实项目中开发，分发的是编译后的文件包。[制作步骤](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/docs/templates.md)、[基线重建](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/custom-add-ons/shared.ts#L111-L151)、[模板编译](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/custom-add-ons/starter.ts#L97-L119)。

这是理解源码与发布模板边界的参考。mystack 无需采用其差分 JSON 格式；从本仓库唯一应用源码打包生成模板同样能维持这条边界。

### 给已有项目添加功能

`tanstack add` 也不能视为任意源码的安全语义合并：已有文件内容不同会被列为覆盖项，必要时要求确认；环境文件有专门的键合并，`package.json` 使用字段合并，其余文件直接写入生成内容。这一行为应与首次 `create` 区分。[现有项目写入](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/add-to-app.ts#L142-L265)。

## 官方目录意味着什么

官方按 framework 放 `project/base/`、`add-ons/`、`toolchains/`、`hosts/`、`examples/`；React 的注册代码显式扫描这些目录。这是在管理多个框架和多个能力包，不是在要求每个 starter 仓库都把应用移进 `templates/`。[目录注册](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/index.ts)。

其 `examples/` 存放 `type: "example"` 的能力包，例如 Events 包带自己的 routes、assets、dependencies 和 integrations，并参与项目生成。这里的 example 与本仓库测试时生成的临时项目不是同一概念。[Events 元数据](https://github.com/TanStack/cli/blob/3f2d3d32e0bc745a9b892ce767555a7f7b4dd591/packages/create/src/frameworks/react/examples/events/info.json)。

对本仓库的目录判断：

- 根目录应用继续负责维护、开发和平台行为检查；mystack 的模板产物在 CLI 构建时生成，不手工维护第二份应用。
- `examples/` 只有在确实维护独立演示产品时才有明确用途；生成验证项目应使用临时目录。
- `templates/` 只有在确实出现多个独立模板或少量配置专属文件时才需要。若将来调整目录，应移动唯一源码并同步所有工具路径，不能复制后长期维护两套。

## mystack 应吸收的做法

以下是基于官方实现作出的建议，不是 TanStack CLI 的既定要求：

1. **完整文件优先。** 配置专属且没有共用逻辑的文件，直接按选项增加、覆盖或删除；依赖和 JSON 配置按结构修改。
2. **共用源码允许受约束的片段变换。** 变化范围小、锚点唯一、找不到或多次匹配就失败，并通过生成项目的类型检查与构建验证时，片段变换是可维护的实现选择；无需为了模仿官方而一次性改成 EJS。
3. **共用入口复杂后，明确生成接口。** 如果同一文件反复被多个选项修改，应将 imports、providers 或 plugins 等变化表达为明确插入点。只有出现实际需要的组合扩展时才引入相应抽象。
4. **模板、CLI 与验证随同发布。** 以最终安装包生成不同配置的项目并检查其实际行为，保证用户获得的源码与维护者验证的产物相同。
5. **创建入口统一为 mystack。** 用户教程从安装发布包、执行 `mystack create` 开始，后续步骤在生成项目内完成；维护者指南单独说明源码 checkout、模板构建和发布过程。

这些建议保持当前平台应用可运行，也吸收了官方最有用的边界：能力文件独立，共用入口有明确生成位置，发布模板从可维护源码产生。
