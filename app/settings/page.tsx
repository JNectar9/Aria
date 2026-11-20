import { getSession } from '@/lib/session'
import Shell from '@/components/Shell'
import { SettingsForm } from '@/components/Forms'

export default async function Settings() {
  const { user, profile, name, ini, unread } = await getSession()
  return (
    <Shell active="settings" name={name} ini={ini} unread={unread}>
      <div className="welcome"><div><h1>Settings</h1><p>Your profile, password and appearance.</p></div></div>
      <SettingsForm userId={user.id} email={user.email ?? ''} profile={profile} fallbackName={name} />
    </Shell>
  )
}
