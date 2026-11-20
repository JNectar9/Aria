import Link from 'next/link'
import { getSession } from '@/lib/session'
import Shell from '@/components/Shell'
import Upload from '@/components/Upload'
import { Icon, Row } from '@/components/bits'

export default async function Dashboard() {
  const { sb, user, name, ini, unread } = await getSession()
  const { data: rows } = await sb.from('verifications').select('*').order('created_at', { ascending: false }).limit(100)
  const { data: projects } = await sb.from('projects').select('id,name').order('created_at')
  const list = rows ?? []
  const ok = list.filter((r) => r.verdict === 'reproduced').length
  const issues = list.filter((r) => r.verdict && r.verdict !== 'reproduced').length
  return (
    <Shell active="dashboard" name={name} ini={ini} unread={unread}>
      <div className="welcome">
        <div><h1>Welcome back, {name}!</h1><p>Let’s verify some research today.</p></div>
        <div className="stats">
          <Link href="/reports" className="stat"><i className="chip info"><Icon n="doc" s={18} /></i><b>{list.length}</b><span>Total Checks</span></Link>
          <Link href="/reports?v=reproduced" className="stat"><i className="chip ok"><Icon n="check" s={18} /></i><b>{ok}</b><span>Successful</span></Link>
          <Link href="/reports?v=issues" className="stat"><i className="chip warn"><Icon n="warn" s={18} /></i><b>{issues}</b><span>Issues</span></Link>
        </div>
      </div>
      <div className="grid">
        <div className="panel" id="upload"><Upload userId={user.id} projects={projects ?? []} /></div>
        <div className="panel">
          <div className="ph"><h3>Recent Reports</h3><Link href="/reports">View all</Link></div>
          {list.length === 0 && <p className="empty">No verifications yet. Upload a paper to start your first one.</p>}
          {list.slice(0, 5).map((r) => <Row key={r.id} r={r} />)}
          <div className="chips" aria-label="Verdict key"><span className="chip ok">Reproduced</span><span className="chip warn">Not reproduced</span><span className="chip info">Incomplete</span><span className="chip gray">Inconclusive</span></div>
        </div>
      </div>
      <div className="band">
        <span style={{ color: 'var(--blue2)' }}><Icon n="shield" s={54} /></span>
        <div><b>Advance Research with Confidence</b><span>Every report shows its runs, logs and limits. Evidence first, verdict second.</span></div>
      </div>
    </Shell>
  )
}
