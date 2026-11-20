import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import Shell from '@/components/Shell'
import ReportEditor from '@/components/ReportEditor'

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await getSession()
  const { data: v } = await s.sb.from('verifications').select('*').eq('id', id).maybeSingle()
  if (!v) notFound()
  const { data: projects } = await s.sb.from('projects').select('id,name').order('created_at')
  let pdfUrl: string | null = null
  if (v.paper_path) {
    const { data } = await s.sb.storage.from('papers').createSignedUrl(v.paper_path, 3600)
    pdfUrl = data?.signedUrl ?? null
  }
  return (
    <Shell active="reports" name={s.name} ini={s.ini} unread={s.unread}>
      <div className="welcome"><div><h1>Verification report</h1><p>Started {new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div></div>
      <ReportEditor key={v.id + (v.locked_at ?? '')} v={v} projects={projects ?? []} pdfUrl={pdfUrl} />
    </Shell>
  )
}
