export type Proof = { kind: 'file' | 'link'; name?: string; path?: string; sha256?: string; size?: number; url?: string; commit?: string }
export type Meta = { python?: string; libraries?: string; os?: string; hardware?: string; dataset_version?: string; config?: string; executed_at?: string }
export type Run = { seed?: string; value: number; note?: string; failed?: boolean; failure_reason?: string; proof?: Proof; meta?: Meta; recorded_at?: string }
export type Rule = 'match' | 'higher_better' | 'lower_better'
export type TolMode = 'absolute' | 'relative'
export type Spec = {
  reported_value: number | null; tolerance: number | null; required_runs: number | null
  runs: Run[] | null; blocked_reason: string | null; rule?: Rule | null; tolerance_mode?: TolMode | null
}
export type VerdictKey = 'reproduced' | 'not_reproduced' | 'incomplete' | 'inconclusive'
export type Evaluation = { verdict: VerdictKey | null; reasons: string[]; n: number; failed: number; mean: number | null; sd: number; tol_abs: number | null }

export const RULE_LABEL: Record<Rule, string> = {
  match: 'Must match: within ± tolerance of the reported value',
  higher_better: 'Higher is better: at least the reported value minus tolerance',
  lower_better: 'Lower is better: at most the reported value plus tolerance',
}

// Counted runs are completed runs with a real number. Everything else is a failed attempt and stays visible.
export function stats(s: Spec) {
  const all = s.runs ?? []
  const vals = all.filter((r) => !r.failed && Number.isFinite(r.value)).map((r) => r.value)
  const n = vals.length
  const mean = n ? vals.reduce((a, b) => a + b, 0) / n : null
  const sd = n > 1 && mean != null ? Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0
  return { n, mean, sd, failed: all.length - n, vals }
}

export function evaluate(s: Spec): Evaluation {
  const st = stats(s)
  const base = { n: st.n, failed: st.failed, mean: st.mean, sd: st.sd, tol_abs: null as number | null }
  const done = (verdict: VerdictKey | null, ...reasons: string[]): Evaluation => ({ ...base, verdict, reasons })
  if (s.blocked_reason) return done('incomplete', `The check was marked unable to finish: ${s.blocked_reason}`)
  const rv = s.reported_value, tol = s.tolerance, req = s.required_runs
  if (rv == null || !Number.isFinite(rv) || tol == null || !Number.isFinite(tol) || !req || req < 1) return done(null, 'The success criteria are incomplete.')
  if (tol <= 0) return done(null, 'The tolerance must be above zero.')
  const mode = s.tolerance_mode ?? 'absolute', rule = s.rule ?? 'match'
  if (mode === 'relative' && rv === 0) return done(null, 'A percentage tolerance cannot be used when the reported value is 0.')
  const tolAbs = mode === 'relative' ? (Math.abs(rv) * tol) / 100 : tol
  base.tol_abs = tolAbs
  if (st.n < req || st.mean == null) return done(null, `${st.n} of ${req} counted runs recorded.`)
  if (st.failed > st.n) return done('inconclusive', `${st.failed} attempts failed against ${st.n} that completed, so the completed runs may not be representative.`)
  const pass = (v: number) => rule === 'match' ? Math.abs(v - rv) <= tolAbs : rule === 'higher_better' ? v >= rv - tolAbs : v <= rv + tolAbs
  const passing = st.vals.filter(pass).length
  if (rule === 'match') {
    if (st.sd > tolAbs) return done('inconclusive', `The runs vary by more than the tolerance (spread ${st.sd.toFixed(3)} is above ${tolAbs.toFixed(3)}).`)
    if (pass(st.mean) && passing === st.n) return done('reproduced', `All ${st.n} runs and their average are within ${tolAbs.toFixed(3)} of ${rv}.`)
    return done('not_reproduced', `${passing} of ${st.n} runs, and/or their average, fall outside ${tolAbs.toFixed(3)} of ${rv}.`)
  }
  const goal = rule === 'higher_better' ? `at least ${(rv - tolAbs).toFixed(3)}` : `at most ${(rv + tolAbs).toFixed(3)}`
  if (passing === st.n) return done('reproduced', `All ${st.n} runs are ${goal}.`)
  if (passing === 0) return done('not_reproduced', `None of the ${st.n} runs are ${goal}.`)
  return done('inconclusive', `${passing} of ${st.n} runs are ${goal} and the rest are not, so the evidence is mixed.`)
}

export const computeVerdict = (s: Spec): VerdictKey | null => evaluate(s).verdict

// Separate dimensions, never one score. A fingerprint shows a file is unchanged since upload, not that the experiment was real.
export function classifyEvidence(runs: Run[] | null) {
  const all = runs ?? []
  return {
    total: all.length,
    self_reported_only: all.filter((r) => !r.proof).length,
    files: all.filter((r) => r.proof?.kind === 'file').length,
    links: all.filter((r) => r.proof?.kind === 'link').length,
    fingerprints: all.filter((r) => r.proof?.kind === 'file' && !!r.proof.sha256).length,
    with_metadata: all.filter((r) => r.meta && Object.values(r.meta).some(Boolean)).length,
    independent_review: 'not_established' as const,
    machine_executed: 0,
  }
}

export function evidenceLevel(runs: Run[] | null): 'none' | 'self' | 'logs' {
  const all = runs ?? []
  if (all.length === 0) return 'none'
  return all.every((r) => !!r.proof) ? 'logs' : 'self'
}

export const EXPLAIN: Record<VerdictKey, string> = {
  reproduced: 'The completed runs met the locked criteria.',
  not_reproduced: 'The runs finished, but the result did not meet the locked criteria. This does not prove the original paper is wrong.',
  incomplete: 'The check could not be finished because something needed (code, data, compute or detail) was unavailable.',
  inconclusive: 'The evidence cannot settle the question.',
}
