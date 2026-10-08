import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import AccountSwitcher from '../components/AccountSwitcher.jsx';
import { getAccountId, setAccountId } from './Dashboard.jsx';

/** Compose a post: publish now or schedule for later. */
export default function Composer() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAid] = useState(getAccountId());
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [when, setWhen] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/accounts').then(({ data }) => setAccounts(data.accounts)).catch(() => {});
  }, []);

  const pick = (id) => { setAid(id); setAccountId(id); };

  const submit = async (now) => {
    setNotice(''); setError('');
    if (!accountId) return setError('Pick an account first.');
    if (!message.trim() && !mediaUrl.trim()) return setError('Write a message or add a media URL.');
    try {
      if (now) {
        const { data } = await api.post('/publish/now', {
          account_id: accountId, message, media_url: mediaUrl || undefined,
        });
        setNotice(`Published! Remote id: ${data.remote_post_id}`);
      } else {
        const scheduled_at = when ? Math.floor(new Date(when).getTime() / 1000) : undefined;
        await api.post('/posts', { account_id: accountId, message, media_url: mediaUrl || undefined, scheduled_at });
        setNotice(when ? `Scheduled for ${when}` : 'Saved to the queue — the scheduler will pick it up.');
      }
      setMessage(''); setMediaUrl(''); setWhen('');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const igSelected = accounts.find((a) => a.id === accountId)?.type === 'instagram';

  return (
    <div>
      <h1>Composer</h1>
      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      <div className="card">
        <label>Account</label>
        <AccountSwitcher accounts={accounts} value={accountId} onChange={pick} />
        <label>Message / caption</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What's happening?" />
        <label>Media URL (optional; required for Instagram)</label>
        <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…" />
        {igSelected && <p className="muted">Instagram posts require a public image URL.</p>}
        <label>Schedule (optional — leave empty to queue for the next scheduler run)</label>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <div className="row">
          <button className="primary" onClick={() => submit(false)}>Schedule</button>
          <button className="ghost" onClick={() => submit(true)}>Publish now</button>
        </div>
      </div>
    </div>
  );
}
