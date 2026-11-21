'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { VERDICT } from './bits'

const STAGES: [string, string][] = [['reading', 'Reading the PDF'], ['analysing', 'Understanding the paper and finding its claims'], ['checking', 'Checking every quote against the paper']]
const REPRO: Record<string, string> = { available: 'Reproducible with available resources', more_resources: 'Reproducible with additional resources', partial: 'Partially reproducible', not_now: 'Not currently reproducible', insufficient: 'Insufficient information' }
const Paper = () => <span className="chip gray">From the paper</span>
const AI = () => <span className="chip info">AI interpretation</span>

export default function AnalysisPanel({ v }: { v: any }) {
  const router = useRouter()
  const [status, setStatus] = useState<string>(v.analysis_status ?? 'none')
  const [stage, setStage] = useState<string>(v.analysis_stage ?? '')
  const [error, setError] = useState<string>(v.analysis_error ?? '')
  const [msg, setMsg] = useState('')
  const locked = !!v.locked_at
  const stale = status === 'running' && v.analysis_started_at && Date.now() - new Date(v.analysis_started_at).getTime() > 10 * 60 * 1000
  const a = v.analysis

  useEffect(() => {
    if (status !== 'running' || stale) return
    const t = setInterval(async () => {
      const { data } = await supabaseBrowser().from('verifications').select('analysis_status,analysis_stage,analysis_error').eq('id', v.id).maybeSingle()
      if (!data) return
      setStage(data.analysis_stage ?? ''); setError(data.analysis_error ?? '')
      if (data.analysis_status !== 'running') { setStatus(data.analysis_status); router.refresh() }
    }, 3000)
    return () => clearInterval(t)
  }, [status, stale])

  async function start() {
    setMsg(''); setError(''); setStatus('running'); setStage('reading')
    const r = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: v.id }) })
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      setStatus(v.analysis_status === 'done' ? 'done' : 'failed'); setError(j.error || 'Could not start the analysis.')
    }
  }

  async function useClaim(c: any, i: number) {
    const cr = c.criteria ?? {}
    const { error } = await supabaseBrowser().from('verifications').update({
      claim_text: c.quote, metric: cr.metric ?? null, reported_value: cr.reported_value ?? null,
      tolerance: cr.tolerance ?? null, required_runs: cr.required_runs ?? 3, selected_claim: i,
    }).eq('id', v.id)
    if (error) return setMsg(error.message)
    router.refresh()
  }

  const expStatus = (i: number) => {
    if (v.selected_claim !== i) return { text: 'Not experimentally tested', cls: 'gray' }
    if (v.verdict && VERDICT[v.verdict]) return { text: `Tested: ${VERDICT[v.verdict][0]}`, cls: VERDICT[v.verdict][1] }
    return { text: locked ? 'Selected, runs in progress' : 'Selected, criteria not locked', cls: 'info' }
  }

  return (
    <div className="panel">
      <h3>Paper analysis</h3>
      {(status === 'none' || status === 'failed' || stale) && (
        <>
          <p className="hint">ARIA reads the PDF, finds the authors’ claims and drafts verification criteria for you to review. This is AI-assisted reading, not verification.</p>
          {(status === 'failed' || stale) && <p className="err" role="alert">{stale ? 'The analysis took too long and stopped.' : error} You can retry.</p>}
          {v.paper_path ? <button className="btn solid" onClick={start}>{status === 'failed' || stale ? 'Retry analysis' : 'Analyse paper'}</button>
            : <p className="hint">Upload the paper as a PDF to enable automatic analysis. Links cannot be analysed yet.</p>}
          {error && status === 'none' && <p className="err">{error}</p>}
        </>
      )}
      {status === 'running' && !stale && (
        <div>
          {STAGES.map(([k, l], i) => {
            const cur = STAGES.findIndex(([s]) => s === stage)
            return <div className="runrow" key={k}><b>{i < cur ? '✓' : i === cur ? '…' : '·'}</b><span style={{ fontWeight: i === cur ? 700 : 400 }}>{l}</span></div>
          })}
          <p className="hint">This usually takes one to three minutes. You can leave this page and come back.</p>
        </div>
      )}
      {status === 'done' && a && (
        <div>
          <p className="hint">Three different things are shown for each claim. <b>Source-matched quotation:</b> the words appear in the PDF. This says nothing about whether the claim is true. <b>AI interpretation:</b> the AI’s reading, which is not evidence. <b>Experimental status:</b> only recorded runs can change it. {a.imported && 'Imported from an AI chat; only the quotations were checked by ARIA. '}{a.truncated && 'The paper was long, so only its first part was read.'}</p>
          <details open><summary><b>Paper information</b> <Paper /></summary>
            <p><b>{a.paper?.title ?? 'Title not found'}</b></p>
            <p className="hint">{(a.paper?.authors ?? []).join(', ') || 'Authors not found'}<br />{[a.paper?.venue, a.paper?.publication_date].filter(Boolean).join(' · ')}
              {a.paper?.doi && <><br />DOI: <a href={`https://doi.org/${a.paper.doi}`} target="_blank" rel="noreferrer">{a.paper.doi}</a> (not yet checked against a registry)</>}</p>
          </details>
          <details><summary><b>Problem, objectives and method</b></summary>
            <p>{a.paper?.research_problem}</p>
            <ul>{(a.paper?.objectives ?? []).map((o: string, i: number) => <li key={i}>{o}</li>)}</ul>
            <p>{a.paper?.methodology}</p>
            <p className="hint">Datasets: {(a.paper?.datasets ?? []).join(', ') || 'none found'}<br />Models: {(a.paper?.models ?? []).join(', ') || 'none found'}</p>
          </details>
          <details><summary><b>Reported results ({(a.paper?.results ?? []).length})</b></summary>
            <ul>{(a.paper?.results ?? []).map((r: any, i: number) => <li key={i}>{r.description}{r.page ? ` (page ${r.page})` : ''}</li>)}</ul>
          </details>
          <details><summary><b>Limitations ({(a.paper?.limitations ?? []).length})</b></summary>
            <ul>{(a.paper?.limitations ?? []).map((r: any, i: number) => <li key={i}>{r.text}{r.page ? ` (page ${r.page})` : ''}</li>)}</ul>
          </details>
          <details><summary><b>Methodological transparency</b> <AI /></summary>
            <p>Rating: <b>{a.transparency?.rating}</b></p>
            <ul>{(a.transparency?.notes ?? []).map((n: string, i: number) => <li key={i}>{n}</li>)}</ul>
            {a.transparency?.code_url && <p className="hint">Code link in paper: {a.transparency.code_url_verified ? <a href={a.transparency.code_url} target="_blank" rel="noreferrer">{a.transparency.code_url}</a> : `${a.transparency.code_url} (not found in the paper text, ignore)`} · availability not yet checked</p>}
            {a.transparency?.data_statement && <p className="hint">Data statement: {a.transparency.data_statement}</p>}
          </details>
          <details><summary><b>References ({(a.paper?.references ?? []).length} listed)</b></summary>
            <ol>{(a.paper?.references ?? []).map((r: string, i: number) => <li key={i} className="hint">{r}</li>)}</ol>
            <p className="hint">Citation checking against external sources is not built yet.</p>
          </details>
          <h3 style={{ marginTop: 18 }}>Claims found ({(a.claims ?? []).length})</h3>
          {(a.claims ?? []).map((c: any, i: number) => {
            const cr = c.criteria ?? {}
            const usable = c.quote_verified && cr.reported_value != null && cr.metric
            const es = expStatus(i)
            return (
              <details key={i} className="claim">
                <summary><span className="chip gray">{c.claim_type}</span> {c.quote_verified ? <span className="chip ok">Source-matched, page {c.page}</span> : <span className="chip warn">Not found in PDF text</span>} <span className={`chip ${es.cls}`}>{es.text}</span><br />{c.quote}</summary>
                <p><Paper /> <b>Source-matched quotation.</b> {c.quote_verified ? `These words appear on page ${c.page} of the PDF. That does not mean the claim is true.` : 'These words could not be found in the PDF text, so this claim cannot be used.'}</p>
                {c.evidence && <p><AI /> <b>Evidence the authors give:</b> {c.evidence}</p>}
                <p><AI /> <b>What it means:</b> {c.meaning}</p>
                {c.requirements && <p><AI /> <b>To verify it:</b> {c.requirements}</p>}
                {c.method && <p><AI /> <b>Suggested method:</b> {c.method}</p>}
                <p><AI /> <b>Reproducibility:</b> {REPRO[c.reproducibility] ?? c.reproducibility}</p>
                {cr.reported_value != null && <p className="hint">Suggested criteria: {cr.metric} = {cr.reported_value}{cr.dataset ? ` on ${cr.dataset}` : ''}{cr.baseline ? `, baseline ${cr.baseline}` : ''}; tolerance ±{cr.tolerance ?? '?'}{cr.tolerance_reason ? ` (${cr.tolerance_reason})` : ''}; {cr.required_runs ?? 3} runs.{c.value_in_quote === false && ' The number is not written in the quotation, so check it against the paper.'}</p>}
                <p><span className={`chip ${es.cls}`}>Experimental status</span> <b>{es.text}.</b> {es.text.startsWith('Not') && 'Only recorded runs under locked criteria can change this.'}</p>
                {c.quote_verified && !usable && <p className="hint">This claim has no single number to test, so ARIA cannot score it yet.</p>}
                {usable && !locked && <button className="btn solid" onClick={() => useClaim(c, i)}>Use this claim for verification</button>}
                {usable && locked && <p className="hint">Criteria are already locked on this report.</p>}
              </details>
            )
          })}
          {msg && <p className="err">{msg}</p>}
          {!locked && <p className="hint">After you tap “Use this claim”, review and edit the criteria in section 1 below, then lock them.</p>}
        </div>
      )}
    </div>
  )
}
