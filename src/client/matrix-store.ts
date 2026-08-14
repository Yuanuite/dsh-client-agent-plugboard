/**
 * Standalone matrix controller: lists the roster, reads one preset's
 * composition plus the host plugin inventory, and drives the editable toggles.
 * It is self-contained — this package does not import `ui-agent-preset`, so the
 * roster and matrix state live here rather than being borrowed.
 */

import type { IApiClient, PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { parseCompositionRows } from './parse-rows.ts'

/** One roster entry, as the page needs it. */
export interface RosterPreset {
  id: string
  trust: 'system' | 'user'
  isDefault: boolean
  name?: string
  description?: string
  broken?: string
}

/** One matrix row, joined from composition + inventory. */
export interface MatrixRow {
  id: string
  moduleName: string
  state: 'enabled' | 'disabled' | 'unknown' | 'unused'
  initial?: 'enabled' | 'disabled' | 'unknown' | 'unused'
}

/** Page snapshot. */
export interface PresetMatrixState {
  status: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'
  error: string | null
  presets: readonly RosterPreset[]
  /** The preset currently opened, or null. */
  selectedId: string | null
  /** Whether the open matrix is read-only (a shipped preset or mid-commit). */
  readOnly: boolean
  saving: boolean
  rows: readonly MatrixRow[]
}

const INITIAL: PresetMatrixState = {
  status: 'idle',
  error: null,
  presets: [],
  selectedId: null,
  readOnly: true,
  saving: false,
  rows: [],
}

/** A declared row's disablement mapped to a matrix display state. */
function declarationState(disabled: boolean | 'unknown'): MatrixRow['state'] {
  return disabled === true ? 'disabled' : disabled === 'unknown' ? 'unknown' : 'enabled'
}

/** Human text for a rejected wire call, whatever it rejected with. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Standalone preset-matrix controller. */
export class PresetMatrixController {
  readonly store: SnapshotStore<PresetMatrixState> = createSnapshotStore(INITIAL)

  constructor(
    private readonly api: Pick<IApiClient, 'agentPresets'>,
    private readonly listPlugins: () => Promise<PluginInventorySnapshot>,
  ) {}

  private set(patch: Partial<PresetMatrixState>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }

  /** Load the roster; empty means the deployment composes no presets. */
  async load(): Promise<void> {
    this.set({ status: 'loading', error: null })
    try {
      const response = await this.api.agentPresets.list({})
      if (!response.result.ok) {
        this.set({ status: 'error', error: response.result.error.message })
        return
      }
      const { presets } = response.result.value
      this.set({
        status: presets.length === 0 ? 'unavailable' : 'ready',
        presets,
        // A preset the roster no longer lists cannot stay selected.
        selectedId: this.store.getSnapshot().selectedId !== null
          && presets.some(preset => preset.id === this.store.getSnapshot().selectedId)
          ? this.store.getSnapshot().selectedId
          : null,
      })
    } catch (error) {
      this.set({ status: 'error', error: messageOf(error) })
    }
  }

  /** Open one preset's matrix. */
  async open(id: string): Promise<void> {
    const preset = this.store.getSnapshot().presets.find(candidate => candidate.id === id)
    if (preset === undefined) {
      this.set({ error: `unknown preset ${id}` })
      return
    }
    this.set({ selectedId: id, error: null, saving: false, rows: [] })
    try {
      const [readResponse, inventory] = await Promise.all([
        this.api.agentPresets.read({ agentPreset: id }),
        this.listPlugins(),
      ])
      if (!readResponse.result.ok) {
        this.set({ error: readResponse.result.error.message })
        return
      }
      const declared = parseCompositionRows(readResponse.result.value.content)
      const byId = new Map<string, MatrixRow>()
      for (const entry of inventory.entries) {
        byId.set(entry.entryId, { id: entry.entryId, moduleName: entry.moduleName, state: 'unused' })
      }
      for (const row of declared.rows) {
        const state = declarationState(row.disabled)
        const existing = byId.get(row.id)
        if (existing === undefined) {
          byId.set(row.id, { id: row.id, moduleName: row.name, state })
        } else {
          existing.state = state
        }
      }
      const declaredIds = declared.rows.map(row => row.id)
      const declaredRows: MatrixRow[] = []
      for (const row of declared.rows) {
        const matrix = byId.get(row.id)
        if (matrix !== undefined) declaredRows.push(matrix)
      }
      const rows = [
        ...declaredRows,
        ...[...byId.values()].filter(row => !declaredIds.includes(row.id)),
      ].map(row => ({ ...row, initial: row.state }))
      this.set({ rows, readOnly: preset.trust !== 'user' })
    } catch (error) {
      this.set({ error: messageOf(error) })
    }
  }

  /** Flip one row's intended state in memory (custom presets only). */
  toggle(id: string): void {
    const state = this.store.getSnapshot()
    if (state.readOnly || state.saving) return
    const rows = state.rows.map((row) => {
      if (row.id !== id) return row
      const next: MatrixRow['state'] = row.state === 'enabled' ? 'disabled' : 'enabled'
      return { ...row, state: next }
    })
    this.set({ rows })
  }

  /** Whether any row changed since open. */
  private hasChanges(state: PresetMatrixState): boolean {
    return state.rows.some(row => row.initial !== undefined && row.initial !== row.state)
  }

  /** Commit the delta and re-read the roster. */
  async commit(): Promise<void> {
    const state = this.store.getSnapshot()
    if (state.selectedId === null || state.readOnly || state.saving) return
    if (!this.hasChanges(state)) {
      this.set({ selectedId: null, rows: [] })
      return
    }
    const entries = state.rows
      .filter(row => row.initial !== undefined && row.initial !== row.state)
      .map(row => ({
        id: row.id,
        enabled: row.state === 'enabled',
        ...row.state === 'enabled' && row.initial === 'unused' ? { moduleName: row.moduleName } : {},
      }))
    this.set({ saving: true, error: null })
    try {
      const response = await this.api.agentPresets.rewrite({ agentPreset: state.selectedId, entries })
      if (!response.result.ok) {
        this.set({ saving: false, error: response.result.error.message })
        return
      }
      this.set({ saving: false, selectedId: null, rows: [] })
      await this.load()
    } catch (error) {
      this.set({ saving: false, error: messageOf(error) })
    }
  }
}
