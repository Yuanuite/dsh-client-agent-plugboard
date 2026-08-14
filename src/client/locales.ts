/** Locale keys for the standalone preset-matrix settings page. */
export type PresetMatrixKey =
  | 'nav' | 'intro'
  | 'loading' | 'error' | 'unavailable' | 'retry'
  | 'pickPreset'
  | 'builtIn' | 'custom'
  | 'matrixEnabled' | 'matrixDisabled' | 'matrixUnused' | 'matrixUnknown'
  | 'matrixLockedIntro' | 'matrixCustomIntro'
  | 'matrixSave' | 'matrixSaving'
  | 'close'

export const en: Record<PresetMatrixKey, string> = {
  nav: 'Preset plugins',
  intro: 'Toggle which plugins a custom preset enables. Changes apply to sessions you start afterwards.',
  loading: 'Loading presets…',
  error: 'Could not load presets.',
  unavailable: 'This deployment composes no agent presets.',
  retry: 'Retry',
  pickPreset: 'Choose a preset to edit its plugins',
  builtIn: 'Built-in',
  custom: 'Custom',
  matrixEnabled: 'On',
  matrixDisabled: 'Off',
  matrixUnused: 'Unused',
  matrixUnknown: 'Platform',
  matrixLockedIntro: 'This built-in preset is read-only. Duplicate it to make one you can edit.',
  matrixCustomIntro: 'Toggle which plugins this preset enables.',
  matrixSave: 'Apply',
  matrixSaving: 'Applying…',
  close: 'Close',
}

export const zh: Record<PresetMatrixKey, string> = {
  nav: '预设插件',
  intro: '切换自定义预设启用的插件。改动对此后新建的会话生效。',
  loading: '正在加载预设…',
  error: '无法加载预设。',
  unavailable: '此部署未组合任何 Agent 预设。',
  retry: '重试',
  pickPreset: '选择一个预设来编辑它的插件',
  builtIn: '内置',
  custom: '自定义',
  matrixEnabled: '已启用',
  matrixDisabled: '已停用',
  matrixUnused: '未使用',
  matrixUnknown: '按平台',
  matrixLockedIntro: '此内置预设只读。复制一份才能编辑。',
  matrixCustomIntro: '切换此预设启用的插件。',
  matrixSave: '应用',
  matrixSaving: '正在应用…',
  close: '关闭',
}
