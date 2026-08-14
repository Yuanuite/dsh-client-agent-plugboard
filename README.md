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
