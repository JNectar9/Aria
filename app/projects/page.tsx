import Link from 'next/link'
import { getSession } from '@/lib/session'
import Shell from '@/components/Shell'
import { Row } from '@/components/bits'
import { ProjectForm } from '@/components/Forms'

export default async function Projects() {
  const { sb, name, ini, unread } = await getSession()
  const { data: projects } = await sb.from('projects').select('*').order('created_at', { ascending: false })
  const { data: rows } = await sb.from('verifications').select('*').order('created_at', { ascending: false })
  const list = rows ?? []
  const loose = list.filter((r) => !r.project_id)
  return (
    <Shell active="projects" name={name} ini={ini} unread={unread}>
      <div className="welcome"><div><h1>Projects</h1><p>Group related checks together.</p></div></div>
      <ProjectForm />
      <div className="pgrid">
        {(projects ?? []).map((p) => {
          const mine = list.filter((r) => r.project_id === p.id)
          return (
            <div className="panel" key={p.id}>
              <div className="ph"><h3>{p.name}</h3><span className="tag">{mine.length} checks</span></div>
              {p.description && <p className="hint">{p.description}</p>}
              {mine.length === 0 && <p className="empty">Empty. Pick this project when you upload a paper.</p>}
              {mine.slice(0, 4).map((r) => <Row key={r.id} r={r} />)}
            </div>
          )
        })}
        {loose.length > 0 && (
          <div className="panel"><div className="ph"><h3>No project</h3><span className="tag">{loose.length} checks</span></div>{loose.slice(0, 4).map((r) => <Row key={r.id} r={r} />)}<Link href="/reports">See all reports</Link></div>
        )}
      </div>
    </Shell>
  )
}
