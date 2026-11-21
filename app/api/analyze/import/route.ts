import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { readPdf, verifyAnalysis, UserError, MAX_PDF_BYTES } from '@/lib/analyze'

export const maxDuration = 60

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { id, json } = body
  if (typeof id !== 'string' || typeof json !== 'string') return bad('Missing data.')
  if (json.length > 300_000) return bad('That is too long to be the analysis.')

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return bad('Please sign in.', 401)
  const { data: v } = await sb.from('verifications').select('id,paper_path').eq('id', id).maybeSingle()
  if (!v) return bad('Report not found.', 404)
  if (!v.paper_path) return bad('Upload the paper as a PDF first, so ARIA can check the quotes.')

  let a: any
  try {
    const start = json.indexOf('{'), end = json.lastIndexOf('}')
    a = JSON.parse(json.slice(start, end + 1))
  } catch { return bad('That is not valid JSON. Paste only the JSON the AI gave you.') }
  if (!a || typeof a !== 'object' || !a.paper || !Array.isArray(a.claims)) return bad('The JSON is missing the "paper" or "claims" part.')
  a.claims = a.claims.filter((c: any) => c && typeof c === 'object')

  try {
    const { data: file, error } = await sb.storage.from('papers').download(v.paper_path)
    if (error || !file) throw new UserError('Could not open the uploaded PDF.')
    const buf = await file.arrayBuffer()
    if (buf.byteLength > MAX_PDF_BYTES) throw new UserError('The PDF is larger than 25 MB.')
    const pages = await readPdf(buf)
    a.transparency = a.transparency ?? { rating: 'unclear', notes: [] }
    const checked = { ...verifyAnalysis(a, pages, false), imported: true }
    const { error: e2 } = await sb.from('verifications').update({
      analysis: checked, analysis_status: 'done', analysis_stage: 'done', analysis_at: new Date().toISOString(),
      analysis_model: 'imported from AI chat', analysis_error: null,
    }).eq('id', id)
    if (e2) throw new Error(e2.message)
    return NextResponse.json({ status: 'done' })
  } catch (e: any) {
    return e instanceof UserError ? bad(e.message) : bad('Import failed. Please try again.', 500)
  }
}
