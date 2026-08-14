/**
 * Standalone preset-matrix settings page: pick a preset, open its plugin matrix,
 * toggle rows (custom presets only), and commit with one Apply.
 */

import { useEffect, type ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PresetMatrixState, RosterPreset } from './matrix-store.ts'
import type { PresetMatrixKey } from './locales.ts'
import css from './AgentPlugboardSection.module.css'

/** Registration-side business face. */
export interface PresetMatrixSectionInjected {
  hooks: { presetMatrix: SnapshotStore<PresetMatrixState> }
  load: () => Promise<void>
  open: (id: string) => Promise<void>
  toggle: (id: string) => void
  commit: () => Promise<void>
}

/** Full component props. */
export type PresetMatrixSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.plugboard'>
  & InjectFace<PresetMatrixSectionInjected>

/** Localized label for one row state. */
function stateLabel(state: PresetMatrixState['rows'][number]['state'], t: (k: PresetMatrixKey) => string): string {
  switch (state) {
    case 'enabled': return t('matrixEnabled')
    case 'disabled': return t('matrixDisabled')
    case 'unknown': return t('matrixUnknown')
    case 'unused': return t('matrixUnused')
  }
}

/** Whether any row changed since open. */
function hasChanges(state: PresetMatrixState): boolean {
  return state.rows.some(row => row.initial !== undefined && row.initial !== row.state)
}

/** Display name for one roster preset. */
function presetName(preset: RosterPreset): string {
  return preset.name ?? preset.id
}

/** Render the standalone matrix settings section. */
export function AgentPlugboardSection({ usePresetMatrix, t, load, open, toggle, commit }: PresetMatrixSectionProps): ReactNode {
  const state = usePresetMatrix(snapshot => snapshot)

  useEffect(() => {
    void load()
  }, [load])

  if (state.status === 'unavailable') return <p className={css.empty}>{t('unavailable')}</p>
  if (state.status === 'error') {
    return (
      <div className={css.section}>
        <p className={css.error} role="alert">{`${t('error')} ${state.error ?? ''}`}</p>
        <Button variant="outline" onClick={() => { void load() }}>{t('retry')}</Button>
      </div>
    )
  }

  const selected = state.presets.find(preset => preset.id === state.selectedId)

  return (
    <div className={css.section}>
      <h2 className={css.title}>{t('nav')}</h2>
      <p className={css.intro}>{t('intro')}</p>

      <label className={css.picker}>
        <span className={css.pickerLabel}>{t('pickPreset')}</span>
        <select
          className={css.select}
          value={state.selectedId ?? ''}
          onChange={(event) => { void open(event.target.value) }}
        >
          <option value="" disabled>{state.status === 'loading' ? t('loading') : t('pickPreset')}</option>
          {state.presets.map(preset => (
            <option key={preset.id} value={preset.id}>
              {presetName(preset)} {preset.trust === 'system' ? `(${t('builtIn')})` : `(${t('custom')})`}
            </option>
          ))}
        </select>
      </label>

      {state.rows.length === 0
        ? null
        : (
          <div>
            <p className={css.matrixIntro}>
              {selected?.trust === 'system' ? t('matrixLockedIntro') : t('matrixCustomIntro')}
            </p>
            <ul className={css.list}>
              {state.rows.map(row => (
                <li key={row.id} className={css.row}>
                  <label className={state.readOnly ? css.rowToggle : `${css.rowToggle} ${css.rowToggleEditable}`}>
                    <input
                      type="checkbox"
                      checked={row.state === 'enabled'}
                      disabled={state.readOnly || state.saving}
                      onChange={() => { toggle(row.id) }}
                    />
                    <span className={`${css.state} ${css[`state_${row.state}`]}`}>
                      {stateLabel(row.state, t)}
                    </span>
                    <span className={css.rowText}>
                      <code className={css.rowId}>{row.id}</code>
                      <span className={css.rowModule}>{row.moduleName}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {state.readOnly
              ? null
              : (
                <div className={css.actions}>
                  <Button disabled={state.saving || !hasChanges(state)} onClick={() => { void commit() }}>
                    {state.saving ? t('matrixSaving') : t('matrixSave')}
                  </Button>
                </div>
              )}
          </div>
        )}
      {state.error === null ? null : <p className={css.error} role="alert">{state.error}</p>}
    </div>
  )
}
