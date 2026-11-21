'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { evaluate, stats, classifyEvidence, EXPLAIN, RULE_LABEL, type Run, type Proof, type Meta, type Rule } from '@/lib/verdict'
import { applyCorrections, verdictImpact, type Correction } from '@/lib/corrections'
import { VERDICT } from './bits'

async function sha256(blob: Blob) {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const EMPTY = {
  seed: '', value: '', note: '', failed: false, failure_reason: '', kind: 'none' as 'none' | 'file' | 'link', link: '', commit: '', file: null as File | null,
  python: '', libraries: '', os: '', hardware: '', dataset_version: '', config: '', executed_at: '',
}
const META_KEYS = ['python', 'libraries', 'os', 'hardware', 'dataset_version', 'config', 'executed_at'] as const
const FIELD_LABEL: Record<string, string> = { value: 'measured value', seed: 'random seed', note: 'note', failure_reason: 'failure reason' }

export default function ReportEditor({ v, projects, pdfUrl, corrections }: { v: any; projects: any[]; pdfUrl: string | null; corrections: Correction[] }) {
  const router = useRouter(); const locked = !!v.locked_at
  const [f, setF] = useState({
    title: v.title as string, claim_text: v.claim_text ?? '', metric: v.metric ?? '', reported_value: v.reported_value ?? '',
    tolerance: v.tolerance ?? '', required_runs: v.required_runs ?? 3, notes: v.notes ?? '', blocked_reason: v.blocked_reason ?? '',
    reviewer_name: v.reviewer_name ?? '', review_done: !!v.review_done, project_id: v.project_id ?? '',
    rule: (v.rule ?? 'match') as Rule, tolerance_mode: (v.tolerance_mode ?? 'absolute') as 'absolute' | 'relative',
  })
  const [runs, setRuns] = useState<Run[]>(v.runs ?? [])
  const [nr, setNr] = useState({ ...EMPTY })
  const [cx, setCx] = useState<{ i: number; field: string; value: string; reason: string } | null>(null)
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const num = (x: any) => (x === '' || x == null ? null : Number(x))
  const specBase = { reported_value: num(f.reported_value), tolerance: num(f.tolerance), required_runs: num(f.required_runs), blocked_reason: String(f.blocked_reason).trim() || null, rule: f.rule, tolerance_mode: f.tolerance_mode }
  const effRuns = applyCorrections(runs, corrections)
  const spec = { ...specBase, runs: effRuns }
  const ev = evaluate(spec); const verdict = ev.verdict; const st = stats(spec); const ec = classifyEvidence(effRuns)
  const impact = verdictImpact(specBase, runs, corrections)
  const quotaFull = specBase.required_runs != null && st.n >= specBase.required_runs
  const sb = supabaseBrowser()

  async function lock() {
    if (!f.claim_text.trim() || !f.metric.trim()) return setMsg('Write the claim and the metric first.')
    if (specBase.reported_value == null || Number.isNaN(specBase.reported_value)) return setMsg('Enter the value the paper reports.')
    if (!specBase.tolerance || specBase.tolerance <= 0) return setMsg('Set a tolerance above zero.')
    if (f.tolerance_mode === 'relative' && specBase.reported_value === 0) return setMsg('A percentage tolerance cannot be used when the reported value is 0.')
    if (!specBase.required_runs || specBase.required_runs < 1) return setMsg('Set at least 1 required run.')
    if (!confirm('Lock these criteria? You will not be able to change them after this.')) return
    setBusy(true)
    const { error } = await sb.from('verifications').update({ claim_text: f.claim_text.trim(), metric: f.metric.trim(), reported_value: specBase.reported_value, tolerance: specBase.tolerance, required_runs: specBase.required_runs, rule: f.rule, tolerance_mode: f.tolerance_mode, locked_at: new Date().toISOString(), status: 'running', reported_result: String(specBase.reported_value) }).eq('id', v.id)
    setBusy(false); setMsg(error ? error.message : 'Criteria locked. You can now record runs.'); router.refresh()
  }

  async function save(nextRuns: Run[] = runs) {
    setBusy(true)
    const eff = applyCorrections(nextRuns, corrections)
    const s = { ...specBase, runs: eff }; const nv = evaluate(s).verdict; const m = stats(s)
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
    if (!nr.failed && (nr.value === '' || !Number.isFinite(value))) return setMsg('Enter the measured value, or tick "This run failed to complete".')
    if (nr.failed && !nr.failure_reason.trim()) return setMsg('Say why the run failed. Failed runs stay on the record.')
    let proof: Proof | undefined
    setBusy(true)
    try {
      if (nr.kind === 'file') {
        if (!nr.file) { setBusy(false); return setMsg('Choose the log file, or pick another proof type.') }
        if (nr.file.size > 10 * 1024 * 1024) { setBusy(false); return setMsg('Keep the file under 10 MB.') }
        const hash = await sha256(nr.file)
        const path = `${v.user_id}/${v.id}/${Date.now()}-${nr.file.name.replace(/[^\w.-]/g, '_')}`
        const up = await sb.storage.from('evidence').upload(path, nr.file)
        if (up.error) { setBusy(false); return setMsg(up.error.message) }
        proof = { kind: 'file', name: nr.file.name, path, sha256: hash, size: nr.file.size }
      } else if (nr.kind === 'link') {
        let u: URL; try { u = new URL(nr.link.trim()) } catch { setBusy(false); return setMsg('Enter a full link, like https://github.com/…') }
        proof = { kind: 'link', url: u.href }
      }
      if (proof && nr.commit.trim()) proof.commit = nr.commit.trim()
    } catch (e: any) { setBusy(false); return setMsg(e?.message || 'Could not read the file.') }
    const meta: Meta = {}
    META_KEYS.forEach((k) => { const x = String(nr[k]).trim(); if (x) meta[k] = x })
    const run: Run = {
      seed: nr.seed.trim() || undefined, value: nr.failed ? 0 : value, note: nr.note.trim() || undefined, failed: nr.failed,
      failure_reason: nr.failed ? nr.failure_reason.trim() : undefined, proof, meta: Object.keys(meta).length ? meta : undefined,
      recorded_at: new Date().toISOString(),
    }
    await save([...runs, run])
    setNr({ ...EMPTY })
  }

  function openCorrect(i: number) {
    setMsg(''); setCx({ i, field: effRuns[i].failed ? 'failure_reason' : 'value', value: '', reason: '' })
  }

  async function submitCorrection() {
    if (!cx) return
    const reason = cx.reason.trim()
    if (reason.length < 10) return setMsg('Explain the correction in at least 10 characters, and say what shows the new value is right.')
    let newValue: any = cx.value.trim()
    if (cx.field === 'value') {
      const x = Number(cx.value)
      if (cx.value.trim() === '' || !Number.isFinite(x)) return setMsg('Enter the corrected number.')
      newValue = x
    }
    const oldValue = (effRuns[cx.i] as any)[cx.field] ?? null
    setBusy(true)
    const row = { verification_id: v.id, target_index: cx.i, field: cx.field, old_value: oldValue, new_value: newValue, reason }
    const ins = await sb.from('corrections').insert(row)
    if (ins.error) { setBusy(false); return setMsg(ins.error.message) }
    const nextCorr = [...corrections, { ...row, created_at: new Date().toISOString() } as Correction]
    const eff = applyCorrections(runs, nextCorr); const s = { ...specBase, runs: eff }
    const nv = evaluate(s).verdict; const m = stats(s)
    const upd = await sb.from('verifications').update({ verdict: nv, status: nv ? 'done' : locked ? 'running' : 'queued', measured_result: m.mean != null ? m.mean.toFixed(3) : null }).eq('id', v.id)
    if (upd.error) setMsg(upd.error.message)
    else {
      if (nv && nv !== v.verdict) await sb.from('notifications').insert({ title: 'Verdict changed after a correction', body: `${f.title}: ${VERDICT[nv][0]}`, link: `/reports/${v.id}` })
      setMsg('Correction recorded. The original is preserved.'); setCx(null); router.refresh()
    }
    setBusy(false)
  }

  async function openFile(path?: string) {
    if (!path) return
    const { data, error } = await sb.storage.from('evidence').createSignedUrl(path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank'); else setMsg(error?.message || 'Could not open the file.')
  }

  async function verifyFile(i: number) {
    const p = runs[i].proof
    if (p?.kind !== 'file' || !p.path || !p.sha256) return
    const { data, error } = await sb.storage.from('evidence').download(p.path)
    if (error || !data) return setMsg(error?.message || 'Could not download the file.')
    const hash = await sha256(data)
    setMsg(hash === p.sha256 ? `Run #${i + 1}: the file matches its recorded fingerprint. It is unchanged since upload.` : `Run #${i + 1}: THE FILE DOES NOT MATCH its recorded fingerprint.`)
  }

  const vk = verdict ? VERDICT[verdict] : null
  const diff = st.mean != null && specBase.reported_value != null ? st.mean - specBase.reported_value : null
  const fieldsFor = (i: number) => (effRuns[i].failed ? ['failure_reason', 'seed', 'note'] : ['value', 'seed', 'note'])
  const history = [...corrections].reverse()
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
        <p className="hint">{locked ? 'These rules were fixed before any run was recorded, so the result cannot be bent to fit. They cannot be corrected. If one is wrong, start a new check.' : 'Decide what counts as success before running anything. After you lock, these cannot change.'}</p>
        <label className="fl"><span>The claim, quoted from the paper</span><textarea rows={2} disabled={locked} value={f.claim_text} onChange={set('claim_text')} placeholder="Model X achieves 92% accuracy on dataset Y" /></label>
        <div className="cols">
          <label className="fl"><span>Metric</span><input disabled={locked} value={f.metric} onChange={set('metric')} placeholder="Accuracy" /></label>
          <label className="fl"><span>Reported value</span><input disabled={locked} type="number" step="any" value={f.reported_value} onChange={set('reported_value')} placeholder="92" /></label>
          <label className="fl"><span>Tolerance (±{f.tolerance_mode === 'relative' ? ' % of reported value' : ' same units'})</span><input disabled={locked} type="number" step="any" value={f.tolerance} onChange={set('tolerance')} placeholder="2" /></label>
          <label className="fl"><span>Runs required</span><input disabled={locked} type="number" min={1} value={f.required_runs} onChange={set('required_runs')} /></label>
        </div>
        <div className="cols">
          <label className="fl"><span>How the result is judged</span><select disabled={locked} value={f.rule} onChange={set('rule')}>{(Object.keys(RULE_LABEL) as Rule[]).map((k) => <option key={k} value={k}>{RULE_LABEL[k]}</option>)}</select></label>
          <label className="fl"><span>Tolerance type</span><select disabled={locked} value={f.tolerance_mode} onChange={set('tolerance_mode')}><option value="absolute">Absolute (same units as the value)</option><option value="relative">Percentage of the reported value</option></select></label>
        </div>
        <p className="hint">Use “Lower is better” for error rates and losses, “Higher is better” for accuracy-style scores, and “Must match” when the paper’s exact number matters.</p>
        {!locked && <button className="btn solid" disabled={busy} onClick={lock}>Lock criteria</button>}
      </div>

      <div className="panel">
        <h3>2. Runs ({st.n}{specBase.required_runs ? ` of ${specBase.required_runs}` : ''} counted, {st.failed} failed)</h3>
        <p className="hint">Record every run, including failures. Recorded runs cannot be deleted or edited, and the database refuses any change to them. Mistakes are fixed with a correction, which keeps the original.</p>
        {runs.length === 0 && <p className="hint">No runs yet.</p>}
        {runs.map((r, i) => {
          const cs = corrections.filter((c) => c.target_index === i)
          const valueFixed = cs.some((c) => c.field === 'value')
          return (
            <div className="runrow" key={i}>
              <b>#{i + 1}</b>
              <span>{r.failed ? 'Failed to complete' : valueFixed ? <><span className="orig">{r.value}</span> {effRuns[i].value}</> : r.value}</span>
              <small>{effRuns[i].seed ? `seed ${effRuns[i].seed}` : ''} {effRuns[i].note ?? ''}</small>
              {cs.length > 0 && <small className="chip warn">{cs.length} correction{cs.length > 1 ? 's' : ''}</small>}
              {locked && <button type="button" className="link" onClick={() => openCorrect(i)}>Correct</button>}
              <div className="proof">
                {r.failed && effRuns[i].failure_reason ? <>Failure reason: {effRuns[i].failure_reason}<br /></> : null}
                {r.proof?.kind === 'file' && <>Log: {r.proof.name} · SHA-256 {r.proof.sha256?.slice(0, 12)}… <button type="button" className="link" onClick={() => openFile(r.proof?.path)}>Open</button> · <button type="button" className="link" onClick={() => verifyFile(i)}>Check fingerprint</button></>}
                {r.proof?.kind === 'link' && <>Link: <a href={r.proof.url} target="_blank" rel="noreferrer">open</a></>}
                {!r.proof && 'No proof attached (self-reported)'}
                {r.proof?.commit ? ` · version ${r.proof.commit}` : ''}
                <br />Recorded {r.recorded_at ? new Date(r.recorded_at).toLocaleString('en-GB') : 'before timestamps were added'}
                {r.meta && Object.values(r.meta).some(Boolean) && <><br />{Object.entries(r.meta).filter(([, x]) => x).map(([k, x]) => `${k.replace('_', ' ')}: ${x}`).join(' · ')} (typed by the person recording the run)</>}
              </div>
              {cx?.i === i && (
                <div className="corr" style={{ flexBasis: '100%' }}>
                  <label className="fl"><span>What to correct</span>
                    <select value={cx.field} onChange={(e) => setCx({ ...cx, field: e.target.value, value: '' })}>{fieldsFor(i).map((k) => <option key={k} value={k}>{FIELD_LABEL[k]}</option>)}</select></label>
                  <label className="fl"><span>Corrected {FIELD_LABEL[cx.field]}</span><input type={cx.field === 'value' ? 'number' : 'text'} step="any" value={cx.value} onChange={(e) => setCx({ ...cx, value: e.target.value })} /></label>
                  <label className="fl"><span>Why, and what shows the new value is right (required)</span><textarea rows={2} value={cx.reason} onChange={(e) => setCx({ ...cx, reason: e.target.value })} placeholder="Typed 85 instead of 95; the log shows 95.1 on line 14" /></label>
                  <p className="hint">The original stays on record and the correction will be visible in the history.</p>
                  <div className="actions"><button className="btn solid" disabled={busy} onClick={submitCorrection}>Record correction</button><button className="btn" onClick={() => setCx(null)}>Cancel</button></div>
                </div>
              )}
            </div>
          )
        })}
        {history.length > 0 && (
          <details><summary><b>Correction history ({history.length})</b></summary>
            {history.map((c, k) => (
              <div className="corr" key={c.id ?? k}>
                <b>Run #{c.target_index + 1} · {FIELD_LABEL[c.field]}</b>: <span className="orig">{String(c.old_value ?? '—')}</span> → {String(c.new_value ?? '—')}
                <div className="hint">{c.reason} · {c.created_at ? new Date(c.created_at).toLocaleString('en-GB') : ''}</div>
              </div>
            ))}
          </details>
        )}
        {locked && !quotaFull && !specBase.blocked_reason && (
          <div className="addrun">
            <div className="cols">
              <label className="fl"><span>Measured value</span><input type="number" step="any" value={nr.value} onChange={(e) => setNr({ ...nr, value: e.target.value })} disabled={nr.failed} /></label>
              <label className="fl"><span>Random seed</span><input value={nr.seed} onChange={(e) => setNr({ ...nr, seed: e.target.value })} /></label>
            </div>
            <label className="fl"><span>Note (optional)</span><input value={nr.note} onChange={(e) => setNr({ ...nr, note: e.target.value })} placeholder="Anything unusual" /></label>
            <details><summary>Environment details (optional)</summary>
              <div className="cols">
                <label className="fl"><span>Python version</span><input value={nr.python} onChange={(e) => setNr({ ...nr, python: e.target.value })} placeholder="3.11.9" /></label>
                <label className="fl"><span>Operating system</span><input value={nr.os} onChange={(e) => setNr({ ...nr, os: e.target.value })} placeholder="Ubuntu 22.04" /></label>
                <label className="fl"><span>Hardware</span><input value={nr.hardware} onChange={(e) => setNr({ ...nr, hardware: e.target.value })} placeholder="Colab T4 GPU" /></label>
                <label className="fl"><span>Dataset version</span><input value={nr.dataset_version} onChange={(e) => setNr({ ...nr, dataset_version: e.target.value })} /></label>
              </div>
              <label className="fl"><span>Library versions</span><input value={nr.libraries} onChange={(e) => setNr({ ...nr, libraries: e.target.value })} placeholder="torch 2.4.0, numpy 1.26" /></label>
              <label className="fl"><span>Experiment configuration</span><textarea rows={2} value={nr.config} onChange={(e) => setNr({ ...nr, config: e.target.value })} placeholder="epochs 12, batch 128, lr 0.001" /></label>
              <label className="fl"><span>When the experiment was run</span><input type="datetime-local" value={nr.executed_at} onChange={(e) => setNr({ ...nr, executed_at: e.target.value })} /></label>
            </details>
            <label className="fl"><span>Proof for this run</span>
              <select value={nr.kind} onChange={(e) => setNr({ ...nr, kind: e.target.value as any })}>
                <option value="none">No proof (self-reported)</option>
                <option value="file">Upload a log file</option>
                <option value="link">Link to code or run</option>
              </select></label>
            {nr.kind === 'file' && <label className="fl"><span>Log file (up to 10 MB)</span><input type="file" onChange={(e) => setNr({ ...nr, file: e.target.files?.[0] ?? null })} /></label>}
            {nr.kind === 'link' && <label className="fl"><span>Link (GitHub commit, Colab, experiment tracker)</span><input value={nr.link} onChange={(e) => setNr({ ...nr, link: e.target.value })} placeholder="https://github.com/…" /></label>}
            {nr.kind !== 'none' && <label className="fl"><span>Code version or commit (optional)</span><input value={nr.commit} onChange={(e) => setNr({ ...nr, commit: e.target.value })} /></label>}
            <label className="agree"><input type="checkbox" checked={nr.failed} onChange={(e) => setNr({ ...nr, failed: e.target.checked })} /><span>This run failed to complete</span></label>
            {nr.failed && <label className="fl"><span>Why did it fail? (required)</span><input value={nr.failure_reason} onChange={(e) => setNr({ ...nr, failure_reason: e.target.value })} placeholder="Out of memory, crashed at epoch 4…" /></label>}
            <button className="btn solid" disabled={busy} onClick={addRun}>Add run</button>
          </div>
        )}
        {!locked && <p className="hint">Lock the criteria first to start recording runs.</p>}
        {quotaFull && <p className="hint">The required number of runs is recorded, so no more can be added. This stops anyone running until the result passes.</p>}
      </div>

      <div className="panel result">
        <h3>3. Experimental reproducibility</h3>
        {vk ? <><span className={`chip ${vk[1]} big`}>{vk[0]}</span><p>{EXPLAIN[verdict!]}</p></> : <p className="hint">No verdict yet.</p>}
        {impact.changed && <p className="err" role="alert">This verdict depends on {impact.count} correction{impact.count > 1 ? 's' : ''}. With the originally recorded values the result is “{impact.original.verdict ? VERDICT[impact.original.verdict][0] : 'no verdict'}”; with the corrected values it is “{impact.corrected.verdict ? VERDICT[impact.corrected.verdict][0] : 'no verdict'}”.</p>}
        {ev.reasons.length > 0 && <p className="hint">{ev.reasons.join(' ')}</p>}
        {st.mean != null && <div className="cols"><div><small>Average measured</small><b>{st.mean.toFixed(3)}</b></div><div><small>Reported</small><b>{specBase.reported_value ?? '—'}</b></div><div><small>Difference</small><b>{diff != null ? diff.toFixed(3) : '—'}</b></div><div><small>Spread (sd)</small><b>{st.sd.toFixed(3)}</b></div><div><small>Failed attempts</small><b>{st.failed}</b></div></div>}
        <p className="hint">This applies only to the selected claim, under its locked criteria. A failed reproduction never proves a paper is false.</p>
        <h3 style={{ marginTop: 16 }}>Evidence integrity</h3>
        <ul className="hint">
          <li>{ec.total} runs recorded; {ec.self_reported_only} self-reported with nothing attached.</li>
          <li>{ec.files} log files and {ec.links} links attached.</li>
          <li>{ec.fingerprints} SHA-256 fingerprints recorded. A fingerprint shows a file is unchanged since upload. It does not show the experiment was real.</li>
          <li>{ec.with_metadata} runs with environment details, typed by the person recording them.</li>
          <li>{corrections.length} corrections recorded; the original values are preserved.</li>
          <li>Independent review: not established. Machine-executed runs: none (not built yet).</li>
        </ul>
      </div>

      <div className="panel">
        <h3>4. Review and notes</h3>
        <label className="fl"><span>Can’t finish this check? Say why (this marks it Incomplete)</span><textarea rows={2} value={f.blocked_reason} onChange={set('blocked_reason')} placeholder="Code not released, dataset removed, needs 8 GPUs…" /></label>
        <label className="fl"><span>Reviewer’s name (typed by you, not verified)</span><input value={f.reviewer_name} onChange={set('reviewer_name')} /></label>
        <label className="agree"><input type="checkbox" checked={f.review_done} onChange={set('review_done')} /><span>This person says they reviewed the evidence</span></label>
        <p className="hint">{f.review_done && String(f.reviewer_name).trim() ? `${f.reviewer_name} is recorded as reviewer, but this is not authenticated, so it is not counted as independent review.` : 'No reviewer recorded.'}</p>
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
