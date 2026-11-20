import Link from 'next/link'
import { getSession } from '@/lib/session'
import Shell from '@/components/Shell'
import { ReadAll } from '@/components/Forms'
import { ago } from '@/components/bits'

export default async function Alerts() {
  const { sb, name, ini, unread } = await getSession()
  const { data } = await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
  const list = data ?? []
  return (
    <Shell active="alerts" name={name} ini={ini} unread={unread}>
      <div className="welcome"><div><h1>Alerts</h1><p>{unread > 0 ? `${unread} unread` : 'You are all caught up.'}</p></div>{unread > 0 && <ReadAll />}</div>
      <div className="panel">
        {list.length === 0 && <p className="empty">No alerts yet. You will see updates here when papers are added and verdicts are reached.</p>}
        {list.map((n) => (
          <Link key={n.id} href={n.link || '/alerts'} className="rep">
            <span className={`dot ${n.read ? 'gray' : 'info'}`}><svg width="20" height="20"><use href="#i-bell" /></svg></span>
            <div><b>{n.title}</b><small>{n.body}</small></div><time>{ago(n.created_at)}</time>
          </Link>
        ))}
      </div>
    </Shell>
  )
}
