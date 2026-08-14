/**
 * Agent Plugboard surface plugin, browser half: a standalone settings section
 * that lets a person pick a preset and toggle its plugins. Self-contained —
 * it imports nothing from `ui-agent-preset`, so it installs beside it (or
 * without it) as an independent bundle.
 */

import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ctx.remote merge and the forwarded-event key face.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the settings shell's SlotMap merge ('settings.section').
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { AgentPlugboardSection, type PresetMatrixSectionInjected } from './AgentPlugboardSection.tsx'
import { PresetMatrixController } from './matrix-store.ts'
import { en, zh, type PresetMatrixKey } from './locales.ts'

export type { PresetMatrixSectionInjected, PresetMatrixSectionProps } from './AgentPlugboardSection.tsx'
export type { PresetMatrixState, MatrixRow, RosterPreset } from './matrix-store.ts'
export type { PresetMatrixKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Agent Plugboard settings page copy. */
    'settings.plugboard': PresetMatrixKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.plugboard'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'connection', 'remote', 'remote.pluginInventory']

/**
 * Mount the Agent Plugboard settings section.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'agent-plugboard: dictionaries')

  const { api } = ctx.get('connection') as ConnectionHandle
  const controller = new PresetMatrixController(api, async () => {
    const result = await ctx.remote.pluginInventory.list()
    if (!result.ok) {
      throw new Error(`pluginInventory.list failed: ${result.error.code}: ${result.error.message}`)
    }
    return result.value
  })

  const injected = (): PresetMatrixSectionInjected => ({
    hooks: { presetMatrix: controller.store },
    load: () => controller.load(),
    open: (id: string) => controller.open(id),
    toggle: (id: string) => { controller.toggle(id) },
    commit: () => controller.commit(),
  })

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'agent-plugboard',
    order: 30,
    label: () => ctx.locale.bind(NS)('nav'),
    locale: NS,
    inject: injected,
  }, AgentPlugboardSection))
}
