import Link from 'next/link'
import { getSession } from '@/lib/session'
import Shell from '@/components/Shell'
import { Row } from '@/components/bits'

const FILTERS: [string, string][] = [['', 'All'], ['reproduced', 'Reproduced'], ['issues', 'Issues'], ['open', 'In progress']]

export default async function Reports({ searchParams }: { searchParams: Promise<{ q?: string; v?: string }> }) {
  const { q = '', v = '' } = await searchParams
  const { sb, name, ini, unread } = await getSession()
  let query = sb.from('verifications').select('*').order('created_at', { ascending: false }).limit(200)
  if (v === 'reproduced') query = query.eq('verdict', 'reproduced')
  else if (v === 'issues') query = query.in('verdict', ['not_reproduced', 'incomplete', 'inconclusive'])
  else if (v === 'open') query = query.is('verdict', null)
  const term = q.replace(/[,()%*]/g, ' ').trim()
  if (term) query = query.or(`title.ilike.%${term}%,claim_text.ilike.%${term}%`)
  const { data } = await query
  const list = data ?? []
  return (
    <Shell active="reports" name={name} ini={ini} unread={unread}>
      <div className="welcome"><div><h1>My Reports</h1><p>{term ? `Results for “${term}”` : 'Every verification you have started.'}</p></div></div>
      <div className="pills">{FILTERS.map(([k, l]) => <Link key={l} href={`/reports?${new URLSearchParams({ ...(k ? { v: k } : {}), ...(term ? { q: term } : {}) })}`} className={v === k ? 'on' : ''}>{l}</Link>)}</div>
      <div className="panel">
        {list.length === 0 && <p className="empty">Nothing here yet. <Link href="/dashboard#upload">Start a verification</Link>.</p>}
        {list.map((r) => <Row key={r.id} r={r} />)}
      </div>
    </Shell>
  )
}
