import { redirect } from 'next/navigation'
import { supabaseServer } from './supabase/server'

export async function getSession() {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
  const name: string = profile?.full_name || user.user_metadata?.full_name || user.email || 'Researcher'
  const ini = name.trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false)
  return { sb, user, profile, name, ini, unread: count ?? 0 }
}
