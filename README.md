# @deepseek-ai/dsh-client-agent-plugboard

**Agent Plugboard** — a standalone DeepSeek Harness plugin that adds an "Agent Plugboard" settings page: pick a preset, toggle its plugins on and off like a patch bay, and Apply.

One line installs it:

```sh
dsh plugin --profile web add @deepseek-ai/dsh-client-agent-plugboard
```

## What you get

A new **Agent Plugboard** entry in Web Settings. Open it, pick any preset from the roster, and you see every plugin that preset declares — plus the host plugins it does not use — each with a toggle:

- **Built-in presets** are read-only (duplicate one to make it yours first).
- **Custom presets** are editable: toggle rows, then **Apply**.

The matrix distinguishes `disabled: true` (off), `!!js <expr>` platform gates (`Platform`), and undeclared host plugins (`Unused`).

## How it works

The page reads a preset's `agent.cordis.yml` (via `agentPreset.read`) and the running host's plugin inventory (`pluginInventory.list`), joins them into one matrix, and commits your toggles through `agentPreset.rewrite` — a comment-preserving YAML edit that only touches the rows you changed. Changes apply to sessions you start **afterwards**; running sessions keep the composition they began with.

## Required host support (⚠️ read this)

The **browser half ships in this package**, but the **backend `agentPreset.rewrite` endpoint it calls belongs to the dsh host** (`@deepseek-ai/dsh-agent-presets` + `@deepseek-ai/dsh-host-apiproxy`). That endpoint is **not yet in a released dsh version** — see the tracking issue / PR:

- [[dsh] agentPreset.rewrite — structured, comment-preserving preset plugin toggles](https://github.com/deepseek-ai/deepseek-harness/issues) (to file)

Until that host change ships, installing this package alone gives you the page, but **Apply fails with `agent-preset-not-found`/404** against an unpatched host. Two ways forward:

1. **Patch your host now** — apply the same three-package change locally (agent-presets `rewriteComposition` + apiproxy `rewrite` RPC + this UI), rebuild, and restart.
2. **Wait for the official release** that merges the host change, then `dsh plugin add` this package works out of the box.

### Self-hosting before the official release (manual patch)

The host change is **three packages** in the dsh source tree. If you build dsh from source, give your agent this exact instruction:

> Add a comment-preserving `agentPreset.rewrite` endpoint to dsh, then install `@deepseek-ai/dsh-client-agent-plugboard`. The change is three packages:
>
> 1. `packages/preset/agent-presets` — add `rewriteComposition(roots, preset, toggles)` to `src/authoring.ts` (reuse `deleteComposition`'s two guards: `preset.trust === 'user'` and path-under-writable-root; edit with the `yaml` v2 `Document` API via `parseDocument`/`set`/`delete`/`addIn` so comments and `!!js` text survive), add a `rewrite(id, toggles)` method to the service in `src/index.ts`, and add `yaml@^2` to its dependencies.
> 2. `packages/host/apiproxy` — add the `rewrite` contract in `src/api/agent-presets.ts`, a request/value schema in `src/api/agent-presets.schema.ts`, the `'agentPreset.rewrite'` key in `src/api/rpc-map.ts`, the handler case in `src/fetch/handler.ts`, the client method in `src/fetch/client.ts`, and the `rewrite` implementation in `src/api-proxy.ts` (loopback-pinned, privileged, like `copy`/`remove`).
> 3. **This package** — already published here; `dsh plugin --profile web add @deepseek-ai/dsh-client-agent-plugboard`.
>
> Then `pnpm run build && pnpm dsh --profile web` and restart.

The precise diff for the first two packages is what the [tracking PR](#) submits to `deepseek-ai/deepseek-harness` — point your agent at that PR once it is filed, and it can reproduce the change exactly rather than re-derive it.

## Install

```sh
# requires pnpm on PATH (dsh forwards to it)
dsh plugin --profile web add @deepseek-ai/dsh-client-agent-plugboard
```

`dsh plugin` installs into your profile and auto-activates this package because it declares a `dsh.bundle` (the `cordis.patch.yml` that inserts its browser row into the profile's layer stack).

## Development

```sh
pnpm install
pnpm --filter @deepseek-ai/dsh-client-agent-plugboard build   # tsc + tsdown
```

The package is a workspace member (`packages/client/agent-plugboard`) and builds with the monorepo's shared `tsdown.client.ts` client preset.

## License

MIT
