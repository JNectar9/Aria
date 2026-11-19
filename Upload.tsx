'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

export default function Upload({ userId }: { userId: string }) {
  const router = useRouter(); const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false); const [note, setNote] = useState(''); const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false)

  async function addFile(file?: File) {
    if (!file) return
    if (file.type !== 'application/pdf') return setNote('Upload a PDF file.')
    if (file.size > 25 * 1024 * 1024) return setNote('Keep the PDF under 25 MB.')
    setBusy(true); setNote('Uploading…'); const sb = supabaseBrowser()
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const up = await sb.storage.from('papers').upload(path, file, { contentType: 'application/pdf' })
    if (up.error) { setBusy(false); return setNote(up.error.message) }
    const ins = await sb.from('verifications').insert({ title: file.name.replace(/\.pdf$/i, ''), paper_path: path })
    setBusy(false); setNote(ins.error ? ins.error.message : 'Added to your queue.'); router.refresh()
  }
  async function addUrl() {
    let u: URL; try { u = new URL(url.trim()) } catch { return setNote('Enter a full link, like https://arxiv.org/abs/…') }
    setBusy(true); const ins = await supabaseBrowser().from('verifications').insert({ title: u.hostname + u.pathname, source_url: u.href })
    setBusy(false); setNote(ins.error ? ins.error.message : 'Added to your queue.'); if (!ins.error) setUrl(''); router.refresh()
  }
  return (
    <div className={`drop${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); addFile(e.dataTransfer.files[0]) }}>
      <svg width="54" height="54" style={{ margin: '0 auto', color: 'var(--blue2)' }}><use href="#i-up" /></svg>
      <h3>Upload a Research Paper</h3>
      <p>Drag &amp; drop or click to upload<br />PDF • ArXiv • URL</p>
      <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => addFile(e.target.files?.[0])} />
      <button className="primary" type="button" disabled={busy} onClick={() => input.current?.click()}>Choose File</button>
      <div className="urlrow"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Or paste an arXiv / paper link" aria-label="Paper link" /><button type="button" disabled={busy} onClick={addUrl}>Add</button></div>
      <div className="picked" aria-live="polite">{note}</div>
    </div>
  )
}
