'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IMPORT_PROMPT } from '@/lib/prompt'

export default function ImportPanel({ id, hasPdf }: { id: string; hasPdf: boolean }) {
  const router = useRouter()
  const [text, setText] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)

  async function copy() {
    try { await navigator.clipboard.writeText(IMPORT_PROMPT); setMsg('Prompt copied.') }
    catch { setMsg('Could not copy automatically. Select the prompt below and copy it.') }
  }
  async function send() {
    if (!text.trim()) return setMsg('Paste the AI’s reply first.')
    setBusy(true); setMsg('')
    const r = await fetch('/api/analyze/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, json: text }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setMsg(j.error || 'Import failed.')
    router.refresh()
  }

  return (
    <div className="panel">
      <h3>Analyse with an AI chat (free)</h3>
      <p className="hint">No API key needed. The AI chat does the reading, and ARIA checks every quote against your PDF.</p>
      {!hasPdf && <p className="err">Upload this paper as a PDF first. Links can’t be checked.</p>}
      <ol className="hint">
        <li>Tap <b>Copy prompt</b>.</li>
        <li>Open a new chat with Claude or another AI, attach the same PDF, paste the prompt and send.</li>
        <li>Copy the AI’s whole reply and paste it below.</li>
      </ol>
      <div className="actions"><button className="btn" onClick={copy}>Copy prompt</button></div>
      <details><summary>Show the prompt</summary><textarea readOnly rows={8} value={IMPORT_PROMPT} style={{ width: '100%' }} /></details>
      <label className="fl"><span>The AI’s reply</span><textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder='{"paper": {…}, "claims": […]}' /></label>
      <button className="btn solid" disabled={busy || !hasPdf} onClick={send}>{busy ? 'Checking quotes…' : 'Import and check'}</button>
      {msg && <p className="err" role="status">{msg}</p>}
    </div>
  )
}
