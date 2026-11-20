import { NextResponse, after } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { readPdf, callModel, verifyAnalysis, UserError, MAX_PDF_BYTES } from '@/lib/analyze'

export const maxDuration = 300

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const id = body?.id
  if (!id || typeof id !== 'string') return NextResponse.json({ error: 'Missing report id.' }, { status: 400 })

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { data: v } = await sb.from('verifications').select('id,paper_path').eq('id', id).maybeSingle()
  if (!v) return NextResponse.json({ error: 'Report not found.' }, { status: 404 })
  if (!v.paper_path) return NextResponse.json({ error: 'Upload the PDF to analyse it. Links cannot be analysed yet.' }, { status: 400 })

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count } = await sb.from('verifications').select('id', { count: 'exact', head: true }).gte('analysis_started_at', since)
  if ((count ?? 0) >= 10) return NextResponse.json({ error: 'Daily analysis limit reached (10). Try again tomorrow.' }, { status: 429 })

  // Claim the job once, so a double tap cannot start two analyses.
  const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: claimed } = await sb.from('verifications')
    .update({ analysis_status: 'running', analysis_stage: 'reading', analysis_error: null, analysis_started_at: new Date().toISOString() })
    .eq('id', id).or(`analysis_status.neq.running,analysis_started_at.lt.${stale}`).select('id')
  if (!claimed?.length) return NextResponse.json({ status: 'already_running' }, { status: 202 })

  after(async () => {
    const stage = (s: string) => sb.from('verifications').update({ analysis_stage: s }).eq('id', id)
    try {
      const { data: file, error } = await sb.storage.from('papers').download(v.paper_path)
      if (error || !file) throw new UserError('Could not open the uploaded PDF.')
      const buf = await file.arrayBuffer()
      if (buf.byteLength > MAX_PDF_BYTES) throw new UserError('The PDF is larger than 25 MB.')
      const pages = await readPdf(buf)
      await stage('analysing')
      const { analysis, truncated, model } = await callModel(pages)
      await stage('checking')
      const checked = verifyAnalysis(analysis, pages, truncated)
      await sb.from('verifications').update({ analysis: checked, analysis_status: 'done', analysis_stage: 'done', analysis_at: new Date().toISOString(), analysis_model: model, analysis_error: null }).eq('id', id)
    } catch (e: any) {
      console.error('analysis failed:', e?.message)
      const msg = e instanceof UserError ? e.message : 'The analysis failed unexpectedly. Please retry.'
      await sb.from('verifications').update({ analysis_status: 'failed', analysis_error: msg }).eq('id', id)
    }
  })
  return NextResponse.json({ status: 'started' }, { status: 202 })
}
