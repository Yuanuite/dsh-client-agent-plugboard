/**
 * Line-level extraction of the plugin rows an `agent.cordis.yml` names, enough
 * to render the matrix. This is NOT a YAML parser: the browser only needs to
 * answer "which plugin ids does this preset declare, and which are disabled"
 * to show the matrix. A minimal indentation scan is sufficient and keeps the
 * runtime free of a YAML dependency.
 *
 * Rows are either bare entries (`- id: …`) or `cordis:group` entries whose
 * `config:` holds a nested list of the same shape. Blank/comment lines are
 * ignored; `#` starts a comment anywhere, and a row's values end at `#`.
 */

/** One declared plugin row, as the matrix needs it. */
export interface PluginRow {
  /** Entry id, e.g. `tool-bash` or `tool-subagent-codex`. */
  id: string
  /** Module name from `name:`, e.g. `@deepseek-ai/dsh-tool-bash`. */
  name: string
  /**
   * The declaration's disablement: `false` for `disabled: false` (or absent),
   * `true` for `disabled: true`, and `'unknown'` for any value this line
   * scanner cannot resolve statically — most notably `disabled: !!js <expr>`,
   * which the Loader evaluates at mount time (platform-gated rows). The matrix
   * must show `'unknown'` rather than inventing an enabled/disabled answer.
   */
  disabled: boolean | 'unknown'
  /** Indentation in spaces, for tests to assert nesting is respected. */
  depth: number
}

/** Parsed composition: the declared plugin rows in file order. */
export interface ParsedComposition {
  /** Every `- id:` row found, top-level and inside `cordis:group` config lists. */
  rows: readonly PluginRow[]
}

/** A bare `- id: x` at any depth, extracted if it also carries a `name:`. */
function parseRow(lines: readonly string[], start: number): PluginRow | null {
  const first = lines[start]
  if (first === undefined) return null
  const depth = first.search(/\S/)
  const idValue = first.match(/^\s*- id:\s*(\S+)/)?.[1] ?? ''
  let name = ''
  let disabled: PluginRow['disabled'] = false
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line === undefined) continue
    // A next list item (any `-` at this entry's own or a shallower depth)
    // ends the row's fields; a bare `- id:` deeper belongs to a nested group
    // and must not bleed its fields into this row.
    if (line.match(/^\s*-/) !== null) break
    const nameMatch = line.match(/^\s*name:\s*(\S+)/)
    if (nameMatch !== null) {
      name = (nameMatch[1] ?? '').replace(/^['"]|['"]$/g, '')
      continue
    }
    const disabledMatch = line.match(/^\s*disabled:\s*(\S+)/)
    if (disabledMatch !== null) {
      const value = disabledMatch[1]
      // `true` / `false` are resolvable statically; anything else (the common
      // `!!js <expr>`, or YAML booleans this scanner does not interpret) is
      // NOT — the Loader evaluates it at mount, so the matrix must not guess.
      disabled = value === 'true' ? true : value === 'false' ? false : 'unknown'
    }
  }
  // A `name: cordis:group` row is the shell for a nested list, not a plugin.
  if (name === '' || name === 'cordis:group') return null
  return { id: idValue, name, disabled, depth }
}

/**
 * Extract the plugin rows a composition text declares. A row without a `name:`
 * is not a plugin (it is a `cordis:group` shell or a bare entry), so it is
 * omitted; nested rows inside `cordis:group` are included at their own depth.
 * @param text - the `agent.cordis.yml` text exactly as `read()` returns it.
 * @returns the declared rows in file order.
 */
export function parseCompositionRows(text: string): ParsedComposition {
  const lines = text.split('\n')
  const rows: PluginRow[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === undefined) continue
    // A comment may follow a value, so strip it before matching the row start.
    const code = line.split('#')[0] ?? ''
    if (!code.match(/^\s*- id:\s+\S+/)) continue
    const row = parseRow(lines, i)
    if (row !== null) rows.push(row)
  }
  return { rows }
}
