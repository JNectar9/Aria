'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

export function ProjectForm() {
  const router = useRouter(); const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const [msg, setMsg] = useState('')
  async function go(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return setMsg('Give the project a name.')
    const { error } = await supabaseBrowser().from('projects').insert({ name: name.trim(), description: desc.trim() || null })
    if (error) return setMsg(error.message)
    setName(''); setDesc(''); setMsg('Project created.'); router.refresh()
  }
  return (
    <form onSubmit={go} className="panel">
      <h3>New project</h3>
      <label className="fl"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vision model baselines" /></label>
      <label className="fl"><span>Description (optional)</span><input value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
      <button className="btn solid" type="submit">Create project</button> <span className="msg">{msg}</span>
    </form>
  )
}

export function SettingsForm({ userId, email, profile, fallbackName }: { userId: string; email: string; profile: any; fallbackName: string }) {
  const router = useRouter()
  const [f, setF] = useState({ full_name: profile?.full_name ?? fallbackName, organization: profile?.organization ?? '', role: profile?.role ?? '' })
  const [pw, setPw] = useState({ a: '', b: '' }); const [m1, setM1] = useState(''); const [m2, setM2] = useState('')
  const sb = supabaseBrowser()
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!f.full_name.trim()) return setM1('Enter your name.')
    const { error } = await sb.from('profiles').upsert({ id: userId, full_name: f.full_name.trim(), organization: f.organization.trim() || null, role: f.role.trim() || null })
    await sb.auth.updateUser({ data: { full_name: f.full_name.trim() } })
    setM1(error ? error.message : 'Profile saved.'); router.refresh()
  }
  async function savePw(e: React.FormEvent) {
    e.preventDefault()
    if (pw.a.length < 8) return setM2('Use at least 8 characters.')
    if (pw.a !== pw.b) return setM2('Passwords do not match.')
    const { error } = await sb.auth.updateUser({ password: pw.a })
    setM2(error ? error.message : 'Password changed.'); if (!error) setPw({ a: '', b: '' })
  }
  function theme(t: string) {
    try { if (t === 'system') localStorage.removeItem('aria-theme'); else localStorage.setItem('aria-theme', t) } catch {}
    if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t
  }
  return (
    <div className="rp">
      <form className="panel" onSubmit={saveProfile}>
        <h3>Profile</h3>
        <label className="fl"><span>Email</span><input value={email} disabled /></label>
        <label className="fl"><span>Full name</span><input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></label>
        <div className="cols">
          <label className="fl"><span>Organization</span><input value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} /></label>
          <label className="fl"><span>Role</span><input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="ML engineer" /></label>
        </div>
        <button className="btn solid" type="submit">Save profile</button> <span className="msg">{m1}</span>
      </form>
      <form className="panel" onSubmit={savePw}>
        <h3>Change password</h3>
        <label className="fl"><span>New password</span><input type="password" autoComplete="new-password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} /></label>
        <label className="fl"><span>Confirm new password</span><input type="password" autoComplete="new-password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} /></label>
        <button className="btn solid" type="submit">Change password</button> <span className="msg">{m2}</span>
      </form>
      <div className="panel">
        <h3>Appearance</h3>
        <div className="actions"><button className="btn" onClick={() => theme('system')}>Match my device</button><button className="btn" onClick={() => theme('light')}>Light</button><button className="btn" onClick={() => theme('dark')}>Dark</button></div>
      </div>
    </div>
  )
}

export function ReadAll() {
  const router = useRouter()
  return <button className="btn" onClick={async () => { await supabaseBrowser().from('notifications').update({ read: true }).eq('read', false); router.refresh() }}>Mark all as read</button>
}
