import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase/server'
import Upload from '@/components/Upload'

const Icon = ({ n, s = 22 }: { n: string; s?: number }) => <svg width={s} height={s}><use href={`#i-${n}`} /></svg>
const VERDICT: Record<string, [string, string, string]> = {
  reproduced: ['Reproduced', 'ok', 'check'],
  not_reproduced: ['Not reproduced under tested conditions', 'warn', 'warn'],
  incomplete: ['Incomplete', 'info', 'clock'],
  inconclusive: ['Inconclusive', 'gray', 'clock'],
}
function ago(d: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000))
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`
}
const nav: [string, string][] = [['home', 'Dashboard'], ['up', 'New Verification'], ['doc', 'My Reports'], ['folder', 'Projects'], ['gear', 'Settings'], ['help', 'Help & Support']]

export default async function Dashboard() {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const { data: rows } = await sb.from('verifications').select('*').order('created_at', { ascending: false }).limit(20)
  const list = rows ?? []
  const name: string = user.user_metadata?.full_name || user.email || 'Researcher'
  const ini = name.trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  const ok = list.filter((r) => r.verdict === 'reproduced').length
  const issues = list.filter((r) => (r.verdict && r.verdict !== 'reproduced') || r.status === 'failed').length

  return (
    <div className="app">
      <aside className="side">
        <div className="logo"><svg width="40" height="36"><use href="#mark" /></svg><b>ARIA</b></div>
        <nav className="nav" aria-label="Main">
          {nav.map(([i, l], k) => <Link key={l} href="/dashboard" className={k === 0 ? 'cur' : ''}><Icon n={i} />{l}</Link>)}
        </nav>
        <div className="me"><span className="av">{ini}</span>
          <div><b style={{ display: 'block', fontSize: '.9rem' }}>{name}</b>
            <form action="/auth/signout" method="post"><button className="link" style={{ fontSize: '.78rem' }}>Sign out</button></form></div></div>
      </aside>
      <main className="main">
        <div className="bar">
          <div className="search"><Icon n="search" s={20} /><input type="search" placeholder="Search papers, claims..." aria-label="Search papers and claims" /></div>
          <button className="iconbtn" aria-label="Notifications"><Icon n="bell" /></button>
          <span className="av">{ini}</span>
        </div>
        <div className="welcome">
          <div><h1>Welcome back, {name}!</h1><p>Let’s verify some research today.</p></div>
          <div className="stats">
            <div className="stat"><i className="chip info"><Icon n="doc" s={18} /></i><b>{list.length}</b><span>Total Checks</span></div>
            <div className="stat"><i className="chip ok"><Icon n="check" s={18} /></i><b>{ok}</b><span>Successful</span></div>
            <div className="stat"><i className="chip warn"><Icon n="warn" s={18} /></i><b>{issues}</b><span>Issues</span></div>
          </div>
        </div>
        <div className="grid">
          <div className="panel"><Upload userId={user.id} /></div>
          <div className="panel">
            <div className="ph"><h3>Recent Reports</h3></div>
            {list.length === 0 && <p style={{ color: 'var(--muted)' }}>No verifications yet. Upload a paper to start your first one.</p>}
            {list.slice(0, 6).map((r) => {
              const v = r.verdict ? VERDICT[r.verdict] : null
              const label = v ? v[0] : r.status === 'failed' ? 'Failed to run' : r.status === 'running' ? 'Running experiment' : 'Queued'
              const cls = v ? v[1] : r.status === 'failed' ? 'warn' : 'gray'
              const sub = v && r.reported_result && r.measured_result ? ` • ${r.measured_result} vs ${r.reported_result}` : ''
              return (
                <div className="rep" key={r.id}>
                  <span className={`dot ${cls}`}><Icon n={v ? v[2] : 'clock'} s={20} /></span>
                  <div><b>{r.title}</b><small>{label}{sub}</small></div><time>{ago(r.created_at)}</time>
                </div>
              )
            })}
            <div className="chips" aria-label="Verdict key"><span className="chip ok">Reproduced</span><span className="chip warn">Not reproduced</span><span className="chip info">Incomplete</span><span className="chip gray">Inconclusive</span></div>
          </div>
        </div>
        <div className="band">
          <span style={{ color: 'var(--blue2)' }}><Icon n="shield" s={54} /></span>
          <div><b>Advance Research with Confidence</b><span>Every report shows its runs, logs and limits. Evidence first, verdict second.</span></div>
        </div>
      </main>
      <nav className="tabs" aria-label="Mobile">
        <Link href="/dashboard" className="cur"><Icon n="home" s={24} />Home</Link>
        <Link href="/dashboard"><Icon n="doc" s={24} />Reports</Link>
        <Link href="/dashboard"><Icon n="bell" s={24} />Alerts</Link>
        <Link href="/dashboard"><Icon n="user" s={24} />Profile</Link>
      </nav>
    </div>
  )
}
