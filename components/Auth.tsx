'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase/client'
import { HERO } from './hero'

const Icon = ({ n, s = 22 }: { n: string; s?: number }) => <svg width={s} height={s}><use href={`#i-${n}`} /></svg>

export default function Auth({ mode }: { mode: 'signup' | 'login' }) {
  const up = mode === 'signup'
  const router = useRouter()
  const [f, setF] = useState({ email: '', name: '', p1: '', p2: '', tos: true })
  const [show, setShow] = useState(false)
  const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: k === 'tos' ? e.target.checked : e.target.value })
  const redirectTo = () => `${location.origin}/auth/callback`

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setMsg('')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Enter a valid email address.')
    if (up && !f.name.trim()) return setErr('Enter your full name.')
    if (f.p1.length < 8) return setErr('Use a password with at least 8 characters.')
    if (up && f.p1 !== f.p2) return setErr('Passwords do not match.')
    if (up && !f.tos) return setErr('Accept the Terms of Service to continue.')
    setBusy(true); const sb = supabaseBrowser()
    if (up) {
      const { data, error } = await sb.auth.signUp({ email: f.email, password: f.p1, options: { data: { full_name: f.name.trim() }, emailRedirectTo: redirectTo() } })
      setBusy(false)
      if (error) return setErr(error.message)
      if (data.session) { router.push('/dashboard'); router.refresh() } else setMsg('Check your email to confirm your account, then sign in.')
    } else {
      const { error } = await sb.auth.signInWithPassword({ email: f.email, password: f.p1 })
      setBusy(false)
      if (error) return setErr(error.message)
      router.push('/dashboard'); router.refresh()
    }
  }
  const google = () => supabaseBrowser().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
  const eye = <button type="button" className="eye" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}><Icon n="eye" /></button>

  return (
    <section style={{ minHeight: '100vh' }}>
      <div className="split">
        <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: HERO }} />
        <div className="pane">
          <div className="topline">{up ? 'Already have an account?' : 'New to ARIA?'} <Link href={up ? '/login' : '/signup'}>{up ? 'Sign In →' : 'Sign Up →'}</Link></div>
          <form className="card" onSubmit={submit} noValidate>
            <h2>{up ? 'Create Your Account' : 'Welcome Back'}</h2>
            <p className="sub">{up ? <>Join <b>ARIA</b> and start verifying research claims today.</> : 'Sign in to continue verifying research claims.'}</p>
            <button type="button" className="google" onClick={google}>
              <svg width="26" height="26" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
              {up ? 'Sign up with Google' : 'Sign in with Google'}
            </button>
            <div className="or">OR</div>
            <label className="field"><Icon n="mail" /><input type="email" placeholder="Email Address" aria-label="Email address" autoComplete="email" value={f.email} onChange={set('email')} /></label>
            {up && <label className="field"><Icon n="user" /><input placeholder="Full Name" aria-label="Full name" autoComplete="name" value={f.name} onChange={set('name')} /></label>}
            <label className="field"><Icon n="lock" /><input type={show ? 'text' : 'password'} placeholder="Password" aria-label="Password" autoComplete={up ? 'new-password' : 'current-password'} value={f.p1} onChange={set('p1')} />{eye}</label>
            {up && <label className="field"><Icon n="lock" /><input type={show ? 'text' : 'password'} placeholder="Confirm Password" aria-label="Confirm password" autoComplete="new-password" value={f.p2} onChange={set('p2')} />{eye}</label>}
            {up && <label className="agree"><input type="checkbox" checked={f.tos} onChange={set('tos')} /><span>I agree to the <a href="/legal#terms">Terms of Service</a> and <a href="/legal#privacy">Privacy Policy</a></span></label>}
            <div className="err" role="alert">{err}</div><div className="msg" role="status">{msg}</div>
            <button className="primary" type="submit" disabled={busy}><Icon n="user" />{busy ? 'Please wait…' : up ? 'Sign Up' : 'Sign In'}</button>
            <div className="secure"><span style={{ color: 'var(--blue2)' }}><Icon n="shield" s={20} /></span>Secure and trusted by JNectarTech</div>
          </form>
        </div>
      </div>
      <div className="foot"><span><b>ARIA</b>Evidence Before Answers. Reproducibility Before Claims.</span><span>© 2026 JNectarTech. All rights reserved.</span></div>
    </section>
  )
}
