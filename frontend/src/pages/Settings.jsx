import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

/**
 * Settings — enter Meta credentials once in the dashboard instead of
 * editing backend/.env. Secrets are stored server-side (SQLite) and are
 * never returned in full; the API only shows a masked preview.
 */
export default function Settings() {
  const [defs, setDefs] = useState([]);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const load = async () => {
    setError('');
    try {
      const { data } = await api.get('/settings');
      setDefs(data.settings);
      setForm({});
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    setNotice('');
    const dirty = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    if (Object.keys(dirty).length === 0) {
      setNotice('Nothing to save — type a value into a field first.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/settings', dirty);
      setDefs(data.settings);
      setForm({});
      setNotice('Settings saved.');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const clear = async (key) => {
    if (!window.confirm('Clear this value? The environment variable (if any) will take over.')) return;
    setError('');
    setNotice('');
    try {
      const { data } = await api.put('/settings', { [key]: '' });
      setDefs(data.settings);
      setForm((f) => ({ ...f, [key]: '' }));
      setNotice('Value cleared.');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const test = async () => {
    setError('');
    setNotice('');
    setTestResult(null);
    setTesting(true);
    try {
      // If the user just typed a token but hasn't saved, test that one.
      const pending = (form.SYSTEM_USER_TOKEN || '').trim();
      const { data } = await api.post('/settings/test', pending ? { token: pending } : {});
      setTestResult(data);
    } catch (e) {
      setTestResult({ ok: false, error: e.response?.data?.error || e.message });
    } finally {
      setTesting(false);
    }
  };

  const badge = (d) => (
    <span className={`badge ${d.configured ? 'ok' : ''}`}>
      {d.configured ? `Saved (${d.source})` : 'Not set'}
    </span>
  );

  return (
    <div>
      <h1>Settings</h1>
      <p className="muted">
        Your Meta app credentials live here — no need to edit files on the server.
        Values are stored in the backend database; secrets are shown masked and are never sent back in full.
      </p>
      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <div className="card">
        {defs.map((d) => (
          <div key={d.key} className="setting-row">
            <div className="setting-head">
              <strong>{d.label}</strong> {badge(d)}
            </div>
            <p className="muted small">{d.hint}</p>
            <div className="row">
              <input
                type={d.secret ? 'password' : 'text'}
                value={form[d.key] || ''}
                placeholder={d.configured ? (d.secret ? `Saved — ${d.preview}` : d.preview) : 'Enter value…'}
                onChange={(e) => setForm((f) => ({ ...f, [d.key]: e.target.value }))}
                autoComplete="off"
                spellCheck="false"
              />
              {d.configured && (
                <button className="ghost" onClick={() => clear(d.key)}>Clear</button>
              )}
            </div>
          </div>
        ))}
        <div className="row" style={{ marginTop: '1rem' }}>
          <button className="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          <button onClick={test} disabled={testing}>
            {testing ? 'Testing…' : 'Test connection'}
          </button>
        </div>
        <p className="muted small" style={{ marginTop: '0.75rem' }}>
          “Test connection” uses the saved system user token — or the one you just typed, if you haven’t saved yet.
        </p>
      </div>

      {testResult && (
        <div className="card">
          <h2>Connection test</h2>
          {testResult.ok ? (
            <div>
              <p><span className="badge ok">Connected</span> as <strong>{testResult.name}</strong> <span className="muted">({testResult.id})</span></p>
              {testResult.token_info && (
                <p className="muted small">
                  App: {testResult.token_info.app_id} · Scopes: {(testResult.token_info.scopes || []).join(', ') || '—'}
                  {testResult.token_info.expires_at ? ` · Expires: ${new Date(testResult.token_info.expires_at * 1000).toLocaleString()}` : ' · Never expires'}
                </p>
              )}
            </div>
          ) : (
            <div className="error">{testResult.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
