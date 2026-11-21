import { evaluate, type Run, type Spec } from './verdict'

export const CORRECTABLE_FIELDS = ['value', 'seed', 'note', 'failure_reason'] as const
export type CorrectionField = (typeof CORRECTABLE_FIELDS)[number]
export type Correction = {
  id?: string; target_index: number; field: CorrectionField
  old_value: unknown; new_value: unknown; reason: string; created_at?: string
}

// Returns a NEW array. The recorded runs are never changed; later corrections win.
export function applyCorrections(runs: Run[] | null, corrections: Correction[] | null): Run[] {
  const out = (runs ?? []).map((r) => ({ ...r }))
  const ordered = (corrections ?? []).map((c, i) => ({ c, i })).sort((a, b) => (a.c.created_at ?? '').localeCompare(b.c.created_at ?? '') || a.i - b.i)
  for (const { c } of ordered) {
    const r = out[c.target_index]
    if (!r) continue
    if (c.field === 'value') { const x = Number(c.new_value); if (c.new_value !== '' && c.new_value != null && Number.isFinite(x) && !r.failed) r.value = x }
    else if (c.field === 'seed') r.seed = String(c.new_value ?? '').trim() || undefined
    else if (c.field === 'note') r.note = String(c.new_value ?? '').trim() || undefined
    else if (c.field === 'failure_reason' && r.failed) r.failure_reason = String(c.new_value ?? '').trim() || undefined
  }
  return out
}

// If corrections change the outcome, the report must say so openly.
export function verdictImpact(spec: Omit<Spec, 'runs'>, runs: Run[] | null, corrections: Correction[] | null) {
  const original = evaluate({ ...spec, runs: runs ?? [] })
  const corrected = evaluate({ ...spec, runs: applyCorrections(runs, corrections) })
  return { original, corrected, changed: original.verdict !== corrected.verdict, count: (corrections ?? []).length }
}
