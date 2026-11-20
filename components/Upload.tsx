'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

export default function Upload({ userId, projects }: { userId: string; projects: { id: string; name: string }[] }) {
  const router = useRouter(); const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false); const [note, setNote] = useState(''); const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false); const [project, setProject] = useState('')

  async function create(title: string, extra: any) {
    const sb = supabaseBrowser()
    const ins = await sb.from('verifications').insert({ title, project_id: project || null, ...extra }).select('id').single()
    if (ins.error) { setNote(ins.error.message); return }
    await sb.from('notifications').insert({ title: 'Paper added', body: title, link: `/reports/${ins.data.id}` })
    router.push(`/reports/${ins.data.id}`)
  }
  async function addFile(file?: File) {
    if (!file) return
    if (file.type !== 'application/pdf') return setNote('Upload a PDF file.')
    if (file.size > 25 * 1024 * 1024) return setNote('Keep the PDF under 25 MB.')
    setBusy(true); setNote('Uploading…'); const sb = supabaseBrowser()
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const up = await sb.storage.from('papers').upload(path, file, { contentType: 'application/pdf' })
    if (up.error) { setBusy(false); return setNote(up.error.message) }
    await create(file.name.replace(/\.pdf$/i, ''), { paper_path: path }); setBusy(false)
  }
  async function addUrl() {
    let u: URL; try { u = new URL(url.trim()) } catch { return setNote('Enter a full link, like https://arxiv.org/abs/…') }
    setBusy(true); await create(u.hostname + u.pathname, { source_url: u.href }); setBusy(false)
  }
  return (
    <div className={`drop${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); addFile(e.dataTransfer.files[0]) }}>
      <svg width="54" height="54" style={{ margin: '0 auto', color: 'var(--blue2)' }}><use href="#i-up" /></svg>
      <h3>Upload a Research Paper</h3>
      <p>Drag &amp; drop or click to upload<br />PDF • ArXiv • URL</p>
      {projects.length > 0 && <select className="psel" value={project} onChange={(e) => setProject(e.target.value)} aria-label="Project"><option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
      <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => addFile(e.target.files?.[0])} />
      <button className="primary" type="button" disabled={busy} onClick={() => input.current?.click()}>Choose File</button>
      <div className="urlrow"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Or paste an arXiv / paper link" aria-label="Paper link" /><button type="button" disabled={busy} onClick={addUrl}>Add</button></div>
      <div className="picked" aria-live="polite">{note}</div>
    </div>
  )
}
