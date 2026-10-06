import { useState } from 'react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Account() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [preferences, setPreferences] = useState(user.preferences || { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, studyDays: [1, 2, 3, 4, 5], sessionMinutes: 45, reminderEnabled: false, reminderTime: '18:00' });
  const [passwords, setPasswords] = useState({ currentPassword: '', password: '', confirm: '' });
  const [saving, setSaving] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const timezones = [...new Set([preferences.timezone, 'UTC', ...(Intl.supportedValuesOf?.('timeZone') || ['Asia/Kolkata'])])];

  async function submit(event, kind) {
    event.preventDefault();
    if (saving) return;
    setError(null); setNotice('');
    if (kind === 'password' && passwords.password !== passwords.confirm) { setError('Passwords do not match.'); return; }
    setSaving(kind);
    try {
      const { data } = kind === 'profile'
        ? await api.patch('/auth/account', { name, preferences })
        : await api.post('/auth/change-password', { currentPassword: passwords.currentPassword, password: passwords.password });
      updateUser(data.user, data.token);
      setNotice(data.message || 'Account settings saved.');
      if (kind === 'password') setPasswords({ currentPassword: '', password: '', confirm: '' });
    } catch (requestError) { setError(requestError); }
    finally { setSaving(''); }
  }

  function preference(key, value) { setPreferences((current) => ({ ...current, [key]: value })); }

  return <section className="page-shell space-y-6 py-10">
    <header><p className="eyebrow">Your account</p><h1 className="mt-3 text-3xl font-bold">Account settings</h1><p className="mt-3 text-slate-600">{user.email}</p></header>
    <ErrorMessage error={error} />
    {notice && <p role="status" className="rounded-xl bg-indigo-50 p-4 text-indigo-900">{notice}</p>}
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="card space-y-5" onSubmit={(event) => submit(event, 'profile')}>
        <h2 className="text-xl font-bold">Profile and study preferences</h2>
        <div><label className="label" htmlFor="account-name">Name</label><input id="account-name" className="field" minLength={2} maxLength={50} required value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div><label className="label" htmlFor="timezone">Timezone</label><select id="timezone" className="field" value={preferences.timezone} onChange={(event) => preference('timezone', event.target.value)}>{timezones.map((zone) => <option key={zone}>{zone}</option>)}</select></div>
        <fieldset><legend className="label">Study days</legend><div className="flex flex-wrap gap-3">{days.map((day, index) => <label key={day} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="accent-indigo-700" checked={preferences.studyDays.includes(index)} onChange={(event) => preference('studyDays', event.target.checked ? [...preferences.studyDays, index].sort() : preferences.studyDays.filter((value) => value !== index))} />{day.slice(0, 3)}</label>)}</div><p className="text-xs text-slate-500">Choose at least one day. These days will guide your daily plan.</p></fieldset>
        <div><label className="label" htmlFor="session-minutes">Preferred session length (minutes)</label><input id="session-minutes" className="field" type="number" min={15} max={180} required value={preferences.sessionMinutes} onChange={(event) => preference('sessionMinutes', Number(event.target.value))} /></div>
        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4"><legend className="px-2 font-semibold">Study reminders</legend><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-indigo-700" checked={preferences.reminderEnabled} onChange={(event) => preference('reminderEnabled', event.target.checked)} />Enable reminders on my study days</label><div><label className="label" htmlFor="reminder-time">Reminder time in {preferences.timezone}</label><input id="reminder-time" className="field" type="time" required value={preferences.reminderTime} onChange={(event) => preference('reminderTime', event.target.value)} /></div><p className="text-xs text-slate-500">Reminders appear in My library. Email reminders are available when the site has email delivery enabled. Turn this off any time.</p></fieldset>
        <button className="btn btn-primary" disabled={Boolean(saving) || !preferences.studyDays.length}>{saving === 'profile' ? 'Saving…' : 'Save settings'}</button>
      </form>
      <form className="card space-y-5 self-start" onSubmit={(event) => submit(event, 'password')}>
        <h2 className="text-xl font-bold">Change password</h2><p className="text-sm text-slate-600">Changing your password signs out your other sessions.</p>
        {[['currentPassword', 'Current password', 'current-password'], ['password', 'New password', 'new-password'], ['confirm', 'Confirm new password', 'new-password']].map(([key, label, autoComplete]) => <div key={key}><label className="label" htmlFor={`account-${key}`}>{label}</label><input id={`account-${key}`} className="field" type="password" autoComplete={autoComplete} minLength={key === 'currentPassword' ? 1 : 8} maxLength={key === 'currentPassword' ? 128 : 72} required value={passwords[key]} onChange={(event) => setPasswords({ ...passwords, [key]: event.target.value })} /></div>)}
        <button className="btn btn-primary" disabled={Boolean(saving)}>{saving === 'password' ? 'Changing…' : 'Change password'}</button>
      </form>
    </div>
  </section>;
}
