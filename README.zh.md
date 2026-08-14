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
