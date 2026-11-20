import Link from 'next/link'

export const Icon = ({ n, s = 22 }: { n: string; s?: number }) => <svg width={s} height={s}><use href={`#i-${n}`} /></svg>

export const VERDICT: Record<string, [string, string, string]> = {
  reproduced: ['Reproduced', 'ok', 'check'],
  not_reproduced: ['Not reproduced under tested conditions', 'warn', 'warn'],
  incomplete: ['Incomplete', 'info', 'clock'],
  inconclusive: ['Inconclusive', 'gray', 'clock'],
}

export function ago(d: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000))
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`
}

export function statusOf(r: any) {
  const v = r.verdict ? VERDICT[r.verdict] : null
  const label = v ? v[0] : r.status === 'failed' ? 'Failed to run' : r.locked_at ? 'Collecting runs' : 'Needs claim and criteria'
  const cls = v ? v[1] : r.locked_at ? 'info' : 'gray'
  return { label, cls, icon: v ? v[2] : 'clock' }
}

export function Row({ r }: { r: any }) {
  const s = statusOf(r)
  const sub = r.verdict && r.reported_result && r.measured_result ? ` • ${r.measured_result} vs ${r.reported_result}` : ''
  return (
    <Link className="rep" href={`/reports/${r.id}`}>
      <span className={`dot ${s.cls}`}><Icon n={s.icon} s={20} /></span>
      <div><b>{r.title}</b><small>{s.label}{sub}</small></div><time>{ago(r.created_at)}</time>
    </Link>
  )
}
