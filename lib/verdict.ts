export type Proof = { kind: 'file' | 'link'; name?: string; path?: string; sha256?: string; size?: number; url?: string; commit?: string }
export type Run = { seed?: string; value: number; note?: string; failed?: boolean; proof?: Proof }
export type Spec = { reported_value: number | null; tolerance: number | null; required_runs: number | null; runs: Run[] | null; blocked_reason: string | null }
export type VerdictKey = 'reproduced' | 'not_reproduced' | 'incomplete' | 'inconclusive'

export function stats(s: Spec) {
  const all = s.runs ?? []
  const vals = all.filter((r) => !r.failed && Number.isFinite(r.value)).map((r) => r.value)
  const n = vals.length
  const mean = n ? vals.reduce((a, b) => a + b, 0) / n : null
  const sd = n > 1 && mean != null ? Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0
  return { n, mean, sd, failed: all.length - n }
}

// Returns null while the check is still collecting runs.
export function computeVerdict(s: Spec): VerdictKey | null {
  if (s.blocked_reason) return 'incomplete'
  if (s.reported_value == null || s.tolerance == null || !s.required_runs) return null
  const { n, mean, sd } = stats(s)
  if (n < s.required_runs || mean == null) return null
  const vals = (s.runs ?? []).filter((r) => !r.failed).map((r) => r.value)
  if (sd > s.tolerance) return 'inconclusive'
  const allWithin = vals.every((v) => Math.abs(v - s.reported_value!) <= s.tolerance!)
  return Math.abs(mean - s.reported_value) <= s.tolerance && allWithin ? 'reproduced' : 'not_reproduced'
}

// How much of the evidence can someone else check?
export function evidenceLevel(runs: Run[] | null): 'none' | 'self' | 'logs' {
  const all = runs ?? []
  if (all.length === 0) return 'none'
  return all.every((r) => !!r.proof) ? 'logs' : 'self'
}

export const EXPLAIN: Record<VerdictKey, string> = {
  reproduced: 'Every counted run, and their average, landed within the locked tolerance of the reported value.',
  not_reproduced: 'The runs finished, but the result did not meet the locked criteria. This does not prove the original paper is wrong.',
  incomplete: 'The check could not be finished because something needed (code, data, compute or detail) was unavailable.',
  inconclusive: 'The runs varied more than the tolerance allows, so the evidence cannot settle the question.',
}
