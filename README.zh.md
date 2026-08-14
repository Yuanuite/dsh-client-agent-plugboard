# @deepseek-ai/dsh-client-agent-plugboard

**Agent Plugboard（Agent 插线板）** — 一个独立的 DeepSeek Harness 插件，为 Web 设置新增「Agent 插线板」页面：选择一个预设，像插线板一样逐个开关它的插件，然后「应用」。

一行命令即可安装：

```sh
dsh plugin --profile web add @deepseek-ai/dsh-client-agent-plugboard
```

## 你能得到什么

Web 设置里多出一个 **Agent 插线板** 入口。打开它，从名单里选一个预设，就能看到该预设声明的每一个插件——以及宿主有、但它没用的插件——每行一个开关：

- **内置预设** 只读（想编辑，先复制一份成你自己的）。
- **自定义预设** 可编辑：切换开关，然后点「应用」。

矩阵会区分 `disabled: true`（已停用）、`!!js <表达式>` 平台门控（「按平台」）、以及未声明的宿主插件（「未使用」）。

## 工作原理

页面读取某个预设的 `agent.cordis.yml`（通过 `agentPreset.read`）和正在运行的宿主的插件清单（`pluginInventory.list`），合成一张矩阵，再通过 `agentPreset.rewrite` 提交你的开关——这是一次**保留注释**的 YAML 编辑，只动你改过的行。改动对此后**新建**的会话生效；运行中的会话保持它们开始时的组装。

## 必需的后端支持（⚠️ 请先读）

**浏览器半侧随本包发布**，但它调用的**后端 `agentPreset.rewrite` 端点属于 dsh 宿主**（`@deepseek-ai/dsh-agent-presets` + `@deepseek-ai/dsh-host-apiproxy`）。该端点**尚未进入任何已发布的 dsh 版本**——见待提交的 issue / PR：

- [[dsh] agentPreset.rewrite —— 结构化、保留注释的预设插件开关](https://github.com/deepseek-ai/deepseek-harness/issues)（待提交）

在宿主改动合并之前，只装本包能拿到页面，但**对未打补丁的宿主，「应用」会以 `agent-preset-not-found`/404 失败**。有两条路：

1. **现在就给宿主打补丁** —— 在本地应用同样的三包改动（agent-presets 的 `rewriteComposition` + apiproxy 的 `rewrite` RPC + 本 UI），重新构建并重启。
2. **等官方发版** 合并宿主改动后，`dsh plugin add` 本包即可开箱即用。

### 官方未更新时，自己怎么装才能用（手动打补丁）

宿主的改动落在 dsh 源码树的**三个包**里。如果你是**从源码构建 dsh**，可以直接把下面这段话发给你的 agent（ChatGPT / Claude / 任何 coding agent），它会照着做：

> 请给 dsh 加一个「保留注释」的 `agentPreset.rewrite` 端点，然后安装 `@deepseek-ai/dsh-client-agent-plugboard`。改动涉及三个包：
>
> 1. `packages/preset/agent-presets` —— 在 `src/authoring.ts` 里新增 `rewriteComposition(roots, preset, toggles)`（复用 `deleteComposition` 的两道防线：`preset.trust === 'user'` 和「路径必须在可写根目录下」；用 `yaml` v2 的 `Document` API（`parseDocument`/`set`/`delete`/`addIn`）做编辑，这样注释和 `!!js` 文本都能保留）；在 `src/index.ts` 的服务类里加 `rewrite(id, toggles)` 方法；在它的依赖里加 `yaml@^2`。
> 2. `packages/host/apiproxy` —— 在 `src/api/agent-presets.ts` 加 `rewrite` 契约，在 `src/api/agent-presets.schema.ts` 加请求/响应 schema，在 `src/api/rpc-map.ts` 加 `'agentPreset.rewrite'` 键，在 `src/fetch/handler.ts` 加 handler case，在 `src/fetch/client.ts` 加客户端方法，在 `src/api-proxy.ts` 加 `rewrite` 实现（loopback-pinned + privileged，和 `copy`/`remove` 一样）。
> 3. **本包** —— 已经发布在这里，直接 `dsh plugin --profile web add @deepseek-ai/dsh-client-agent-plugboard`。
>
> 然后 `pnpm run build && pnpm dsh --profile web`，重启即可。

前两个包的具体 diff，就是那个要提交给 `deepseek-ai/deepseek-harness` 的 [tracking PR](#)。等 PR 建好后，让 agent 直接照着这个 PR 来，就能**精确复现**改动，而不是自己重新摸索。

#### 如果你「不是」从源码构建 dsh

那你现在只有一条路：**等官方发版**。因为后端改动在 dsh 宿主的 npm 发布包里，普通用户（只 `npx dsh` / 用已打包版本）没法在不 fork 的情况下改到它。

> 进阶：你也可以 fork `deepseek-ai/deepseek-harness`，把上面三个包的改动打进去，自己 `pnpm build` 出一个带 `rewrite` 的宿主，再 `dsh plugin add` 本包——这等同于「从源码构建」路径。

## 安装

```sh
# 需要 pnpm 在 PATH 上（dsh 会转发给它）
dsh plugin --profile web add @deepseek-ai/dsh-client-agent-plugboard
```

`dsh plugin` 会装进你的 profile 并**自动激活**本包，因为它声明了 `dsh.bundle`（那个把浏览器行插入 profile 层栈的 `cordis.patch.yml`）。

## 开发

```sh
pnpm install
pnpm --filter @deepseek-ai/dsh-client-agent-plugboard build   # tsc + tsdown
```

本包是 workspace 成员（`packages/client/agent-plugboard`），用 monorepo 共享的 `tsdown.client.ts` 客户端预设构建。

## License

MIT
