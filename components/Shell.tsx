import Link from 'next/link'
import { Icon } from './bits'

const nav: [string, string, string, string][] = [
  ['home', 'Dashboard', '/dashboard', 'dashboard'], ['up', 'New Verification', '/dashboard#upload', 'new'],
  ['doc', 'My Reports', '/reports', 'reports'], ['folder', 'Projects', '/projects', 'projects'],
  ['gear', 'Settings', '/settings', 'settings'], ['help', 'Help & Support', '/legal#help', 'help'],
]

export default function Shell({ active, name, ini, unread, children }: { active: string; name: string; ini: string; unread: number; children: React.ReactNode }) {
  return (
    <div className="app">
      <aside className="side">
        <Link href="/" className="logo" style={{ color: 'var(--text)' }}><svg width="40" height="36"><use href="#mark" /></svg><b>ARIA</b></Link>
        <nav className="nav" aria-label="Main">
          {nav.map(([i, l, h, k]) => <Link key={l} href={h} className={k === active ? 'cur' : ''}><Icon n={i} />{l}</Link>)}
        </nav>
        <div className="me"><Link href="/profile" className="av">{ini}</Link>
          <div><b style={{ display: 'block', fontSize: '.9rem' }}>{name}</b>
            <form action="/auth/signout" method="post"><button className="link" style={{ fontSize: '.78rem' }}>Sign out</button></form></div></div>
      </aside>
      <main className="main">
        <div className="bar">
          <form action="/reports" className="search"><Icon n="search" s={20} /><input name="q" type="search" placeholder="Search papers, claims..." aria-label="Search papers and claims" /></form>
          <Link className="iconbtn bell" href="/alerts" aria-label="Alerts"><Icon n="bell" />{unread > 0 && <i className="badge">{unread > 9 ? '9+' : unread}</i>}</Link>
          <Link href="/profile" className="av" aria-label="Profile">{ini}</Link>
        </div>
        {children}
      </main>
      <nav className="tabs" aria-label="Mobile">
        <Link href="/dashboard" className={active === 'dashboard' ? 'cur' : ''}><Icon n="home" s={24} />Home</Link>
        <Link href="/reports" className={active === 'reports' ? 'cur' : ''}><Icon n="doc" s={24} />Reports</Link>
        <Link href="/alerts" className={`bell ${active === 'alerts' ? 'cur' : ''}`}><Icon n="bell" s={24} />Alerts{unread > 0 && <i className="badge">{unread > 9 ? '9+' : unread}</i>}</Link>
        <Link href="/profile" className={active === 'profile' ? 'cur' : ''}><Icon n="user" s={24} />Profile</Link>
      </nav>
    </div>
  )
}
