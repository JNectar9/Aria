import Link from 'next/link'
import { getSession } from '@/lib/session'
import Shell from '@/components/Shell'
import { Icon } from '@/components/bits'

export default async function Profile() {
  const { sb, user, profile, name, ini, unread } = await getSession()
  const { data } = await sb.from('verifications').select('verdict')
  const list = data ?? []
  const since = new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  return (
    <Shell active="profile" name={name} ini={ini} unread={unread}>
      <div className="panel prof">
        <span className="av">{ini}</span>
        <div><h1 style={{ margin: 0 }}>{name}</h1><p className="hint" style={{ margin: '4px 0 0' }}>{user.email}</p>
          <p className="hint" style={{ margin: '2px 0 0' }}>{[profile?.role, profile?.organization].filter(Boolean).join(' at ') || 'Add your role and organization in Settings'} · Member since {since}</p></div>
      </div>
      <div className="stats" style={{ margin: '18px 0' }}>
        <div className="stat"><b>{list.length}</b><span>Total checks</span></div>
        <div className="stat"><b>{list.filter((r) => r.verdict === 'reproduced').length}</b><span>Reproduced</span></div>
        <div className="stat"><b>{list.filter((r) => !r.verdict).length}</b><span>In progress</span></div>
      </div>
      <div className="menu">
        <Link href="/settings"><Icon n="gear" />Settings and password</Link>
        <Link href="/projects"><Icon n="folder" />Projects</Link>
        <Link href="/reports"><Icon n="doc" />My Reports</Link>
        <Link href="/legal#help"><Icon n="help" />Help and support</Link>
        <form action="/auth/signout" method="post"><button type="submit"><Icon n="user" />Sign out</button></form>
      </div>
    </Shell>
  )
}
