import { classifyEvidence } from '@/lib/verdict'
import { applyCorrections, verdictImpact, type Correction } from '@/lib/corrections'
import { VERDICT } from './bits'

const Line = ({ title, chip, cls, children }: { title: string; chip: string; cls: string; children: React.ReactNode }) => (
  <div className="runrow" style={{ alignItems: 'flex-start' }}>
    <div style={{ flex: 1, minWidth: 0 }}><b>{title}</b><div className="hint" style={{ margin: '4px 0 0' }}>{children}</div></div>
    <span className={`chip ${cls}`}>{chip}</span>
  </div>
)

export default function AssessmentPanel({ v, corrections }: { v: any; corrections: Correction[] }) {
  const a = v.analysis
  const claims: any[] = a?.claims ?? []
  const matched = claims.filter((c) => c.quote_verified).length
  const n = (x: any) => (x == null ? null : Number(x))
  const runs = v.runs ?? []
  const base = { reported_value: n(v.reported_value), tolerance: n(v.tolerance), required_runs: n(v.required_runs), blocked_reason: v.blocked_reason ?? null, rule: v.rule, tolerance_mode: v.tolerance_mode }
  const impact = verdictImpact(base, runs, corrections)
  const ev = impact.corrected
  const ec = classifyEvidence(applyCorrections(runs, corrections))
  const vk = ev.verdict ? VERDICT[ev.verdict] : null
  const tested = !!v.locked_at || runs.length > 0 || !!v.blocked_reason
  return (
    <div className="panel">
      <h3>Assessment summary</h3>
      <p className="hint">Six separate questions. ARIA does not combine them into one score: a paper can be genuine yet hard to reproduce, and a quotation can match the PDF while its claim is still untested.</p>
      <Line title="Publication authenticity" chip="Not checked" cls="gray">DOI and publication records have not been checked yet. Not being checked says nothing about whether the paper is genuine.</Line>
      <Line title="Source accuracy" chip={a ? (claims.length ? `${matched} of ${claims.length} matched` : 'No claims') : 'Not analysed'} cls={a && claims.length ? (matched === claims.length ? 'ok' : 'warn') : 'gray'}>Whether extracted quotations appear in the PDF text. This is about copying accuracy only. It does not show any claim is true.</Line>
      <Line title="Methodological assessment" chip={a?.transparency?.rating ? `AI view: ${a.transparency.rating}` : 'Not analysed'} cls={a?.transparency?.rating ? 'info' : 'gray'}>An AI interpretation of what the paper says about its code, data and method. It has not been independently checked.</Line>
      <Line title="Experimental reproducibility" chip={vk ? vk[0] : tested ? 'In progress' : 'Not tested'} cls={vk ? vk[1] : tested ? 'info' : 'gray'}>
        {tested ? ev.reasons.join(' ') : 'No experiment has been run for any claim.'} Applies only to the selected claim under its locked criteria. A failed reproduction does not show the paper is false.
        {impact.changed && <b> This verdict depends on {impact.count} correction{impact.count > 1 ? 's' : ''}: the originally recorded values give “{impact.original.verdict ? VERDICT[impact.original.verdict][0] : 'no verdict'}”.</b>}
      </Line>
      <Line title="Evidence integrity" chip={ec.total === 0 ? 'No runs' : ec.self_reported_only > 0 ? 'Self-reported runs' : 'Files or links attached'} cls={ec.total === 0 ? 'gray' : ec.self_reported_only > 0 ? 'warn' : 'info'}>{ec.total} runs; {ec.self_reported_only} self-reported with nothing attached; {ec.files} files and {ec.links} links attached; {ec.fingerprints} SHA-256 fingerprints recorded; {ec.with_metadata} with environment details; {corrections.length} corrections (originals preserved); {ec.machine_executed} machine-executed. A fingerprint shows a file is unchanged since upload. It does not show the experiment was real.</Line>
      <Line title="Independent review" chip="Not established" cls="gray">{v.reviewer_name ? `A reviewer name (${v.reviewer_name}) was typed in by the report owner. That is not authenticated, so it is not counted as independent review.` : 'No reviewer recorded.'} Authenticated reviewer confirmation is not built yet.</Line>
    </div>
  )
}
