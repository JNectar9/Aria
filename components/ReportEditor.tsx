'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { computeVerdict, stats, EXPLAIN, type Run } from '@/lib/verdict'
import { VERDICT } from './bits'

export default function ReportEditor({ v, projects, pdfUrl }: { v: any; projects: any[]; pdfUrl: string | null }) {
  const router = useRouter(); const locked = !!v.locked_at
  const [f, setF] = useState({
    title: v.title as string, claim_text: v.claim_text ?? '', metric: v.metric ?? '', reported_value: v.reported_value ?? '',
    tolerance: v.tolerance ?? '', required_runs: v.required_runs ?? 3, notes: v.notes ?? '', blocked_reason: v.blocked_reason ?? '',
    reviewer_name: v.reviewer_name ?? '', review_done: !!v.review_done, project_id: v.project_id ?? '',
  })
  const [runs, setRuns] = useState<Run[]>(v.runs ?? [])
  const [nr, setNr] = useState({ seed: '', value: '', note: '', failed: false })
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const num = (x: any) => (x === '' || x == null ? null : Number(x))
  const spec = { reported_value: num(f.reported_value), tolerance: num(f.tolerance), required_runs: num(f.required_runs), runs, blocked_reason: String(f.blocked_reason).trim() || null }
  const verdict = computeVerdict(spec); const st = stats(spec)
  const quotaFull = spec.required_runs != null && st.n >= spec.required_runs
  const sb = supabaseBrowser()

  async function lock() {
    if (!f.claim_text.trim() || !f.metric.trim()) return setMsg('Write the claim and the metric first.')
    if (spec.reported_value == null || Number.isNaN(spec.reported_value)) return setMsg('Enter the value the paper reports.')
    if (!spec.tolerance || spec.tolerance <= 0) return setMsg('Set a tolerance above zero.')
    if (!spec.required_runs || spec.required_runs < 1) return setMsg('Set at least 1 required run.')
    if (!confirm('Lock these criteria? You will not be able to change them after this.')) return
    setBusy(true)
    const { error } = await sb.from('verifications').update({ claim_text: f.claim_text.trim(), metric: f.metric.trim(), reported_value: spec.reported_value, tolerance: spec.tolerance, required_runs: spec.required_runs, locked_at: new Date().toISOString(), status: 'running', reported_result: String(spec.reported_value) }).eq('id', v.id)
    setBusy(false); setMsg(error ? error.message : 'Criteria locked. You can now record runs.'); router.refresh()
  }

  async function save(nextRuns: Run[] = runs) {
    setBusy(true)
    const s = { ...spec, runs: nextRuns }; const nv = computeVerdict(s); const m = stats(s)
    const { error } = await sb.from('verifications').update({
      title: f.title.trim() || v.title, runs: nextRuns, verdict: nv, status: nv ? 'done' : locked ? 'running' : 'queued',
      measured_result: m.mean != null ? m.mean.toFixed(3) : null, notes: f.notes || null, blocked_reason: s.blocked_reason,
      reviewer_name: f.reviewer_name || null, review_done: !!(f.review_done && String(f.reviewer_name).trim()), project_id: f.project_id || null,
    }).eq('id', v.id)
    if (error) setMsg(error.message)
    else {
      if (nv && nv !== v.verdict) await sb.from('notifications').insert({ title: 'Verdict reached', body: `${f.title}: ${VERDICT[nv][0]}`, link: `/reports/${v.id}` })
      setRuns(nextRuns); setMsg('Saved.'); router.refresh()
    }
    setBusy(false)
  }

  async function addRun() {
    const value = Number(nr.value)
    if (!nr.failed && (nr.value === '' || Number.isNaN(value))) return setMsg('Enter the measured value, or tick "run failed".')
    await save([...runs, { seed: nr.seed.trim() || undefined, value: nr.failed ? NaN : value, note: nr.note.trim() || undefined, failed: nr.failed }].map((r) => ({ ...r, value: Number.isNaN(r.value) ? 0 : r.value })))
    setNr({ seed: '', value: '', note: '', failed: false })
  }

  const vk = verdict ? VERDICT[verdict] : null
  const diff = st.mean != null && spec.reported_value != null ? st.mean - spec.reported_value : null
  return (
    <div className="rp">
      <div className="panel">
        <label className="fl"><span>Report title</span><input value={f.title} onChange={set('title')} /></label>
        <div className="cols">
          <label className="fl"><span>Project</span><select value={f.project_id} onChange={set('project_id')}><option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <div className="fl"><span>Paper</span><div>{pdfUrl ? <a href={pdfUrl} target="_blank" rel="noreferrer">Open uploaded PDF</a> : v.source_url ? <a href={v.source_url} target="_blank" rel="noreferrer">Open paper link</a> : 'No file attached'}</div></div>
        </div>
      </div>

      <div className="panel">
        <h3>1. Claim and success criteria {locked && <span className="chip ok" style={{ marginLeft: 8 }}>Locked</span>}</h3>
        <p className="hint">{locked ? 'These rules were fixed before any run was recorded, so the result cannot be bent to fit.' : 'Decide what counts as success before running anything. After you lock, these cannot change.'}</p>
        <label className="fl"><span>The claim, quoted from the paper</span><textarea rows={2} disabled={locked} value={f.claim_text} onChange={set('claim_text')} placeholder="Model X achieves 92% accuracy on dataset Y" /></label>
        <div className="cols">
          <label className="fl"><span>Metric</span><input disabled={locked} value={f.metric} onChange={set('metric')} placeholder="Accuracy" /></label>
          <label className="fl"><span>Reported value</span><input disabled={locked} type="number" step="any" value={f.reported_value} onChange={set('reported_value')} placeholder="92" /></label>
          <label className="fl"><span>Tolerance (±)</span><input disabled={locked} type="number" step="any" value={f.tolerance} onChange={set('tolerance')} placeholder="2" /></label>
          <label className="fl"><span>Runs required</span><input disabled={locked} type="number" min={1} value={f.required_runs} onChange={set('required_runs')} /></label>
        </div>
        {!locked && <button className="btn solid" disabled={busy} onClick={lock}>Lock criteria</button>}
      </div>

      <div className="panel">
        <h3>2. Runs ({st.n}{spec.required_runs ? ` of ${spec.required_runs}` : ''} counted)</h3>
        <p className="hint">Record every run, including failures. Runs cannot be deleted.</p>
        {runs.length === 0 && <p className="hint">No runs yet.</p>}
        {runs.map((r, i) => (
          <div className="runrow" key={i}><b>#{i + 1}</b><span>{r.failed ? 'Failed to complete' : r.value}</span><small>{r.seed ? `seed ${r.seed}` : ''} {r.note ?? ''}</small></div>
        ))}
        {locked && !quotaFull && !spec.blocked_reason && (
          <div className="addrun">
            <div className="cols">
              <label className="fl"><span>Measured value</span><input type="number" step="any" value={nr.value} onChange={(e) => setNr({ ...nr, value: e.target.value })} disabled={nr.failed} /></label>
              <label className="fl"><span>Random seed</span><input value={nr.seed} onChange={(e) => setNr({ ...nr, seed: e.target.value })} /></label>
            </div>
            <label className="fl"><span>Note (optional)</span><input value={nr.note} onChange={(e) => setNr({ ...nr, note: e.target.value })} placeholder="GPU, library versions, anything unusual" /></label>
            <label className="agree"><input type="checkbox" checked={nr.failed} onChange={(e) => setNr({ ...nr, failed: e.target.checked })} /><span>This run failed to complete</span></label>
            <button className="btn solid" disabled={busy} onClick={addRun}>Add run</button>
          </div>
        )}
        {!locked && <p className="hint">Lock the criteria first to start recording runs.</p>}
        {quotaFull && <p className="hint">The required number of runs is recorded, so no more can be added. This stops anyone running until the result passes.</p>}
      </div>

      <div className="panel result">
        <h3>3. Verdict</h3>
        {vk ? <><span className={`chip ${vk[1]} big`}>{vk[0]}</span><p>{EXPLAIN[verdict!]}</p></> : <p className="hint">Still collecting runs. A verdict appears once the required runs are recorded.</p>}
        {st.mean != null && <div className="cols"><div><small>Average measured</small><b>{st.mean.toFixed(3)}</b></div><div><small>Reported</small><b>{spec.reported_value ?? '—'}</b></div><div><small>Difference</small><b>{diff != null ? diff.toFixed(3) : '—'}</b></div><div><small>Spread (sd)</small><b>{st.sd.toFixed(3)}</b></div></div>}
        <p className="hint">Rule: reproduced only if the average and every run are within the tolerance and the spread is not larger than the tolerance. A failed reproduction never proves a paper is false.</p>
      </div>

      <div className="panel">
        <h3>4. Review and notes</h3>
        <label className="fl"><span>Can’t finish this check? Say why (this marks it Incomplete)</span><textarea rows={2} value={f.blocked_reason} onChange={set('blocked_reason')} placeholder="Code not released, dataset removed, needs 8 GPUs…" /></label>
        <label className="fl"><span>Independent reviewer’s name</span><input value={f.reviewer_name} onChange={set('reviewer_name')} /></label>
        <label className="agree"><input type="checkbox" checked={f.review_done} onChange={set('review_done')} /><span>A qualified person has reviewed this evidence</span></label>
        <p className="hint">{f.review_done && String(f.reviewer_name).trim() ? `Human review: completed by ${f.reviewer_name}.` : 'Human review: pending. Reports are never shown as reviewed until a named person confirms.'}</p>
        <label className="fl"><span>Notes</span><textarea rows={3} value={f.notes} onChange={set('notes')} /></label>
      </div>

      <div className="noprint actions">
        <button className="primary" disabled={busy} onClick={() => save()}>{busy ? 'Saving…' : 'Save report'}</button>
        <button className="btn" onClick={() => window.print()}>Print or save as PDF</button>
        <span className="msg" role="status">{msg}</span>
      </div>
    </div>
  )
}
