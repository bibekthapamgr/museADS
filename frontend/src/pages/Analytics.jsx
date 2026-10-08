import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import Chart from '../components/Chart.jsx';
import { getAccountId } from './Dashboard.jsx';

/** Page KPIs + post insights (Facebook posts / IG media). */
export default function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [account, setAccount] = useState(null);
  const [mediaId, setMediaId] = useState('');
  const [postMetrics, setPostMetrics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setError('');
      try {
        const { data: acc } = await api.get('/accounts');
        const sel = acc.accounts.find((a) => a.id === getAccountId()) || acc.accounts[0];
        setAccount(sel || null);
        if (!sel || sel.type !== 'page') return;
        const { data } = await api.get(`/insights/page/${sel.remote_id}`);
        setMetrics(data.metrics);
      } catch (e) {
        setError(e.response?.data?.error || e.message);
      }
    };
    load();
  }, []);

  const lookupPost = async () => {
    setError(''); setPostMetrics(null);
    if (!mediaId.trim() || !account) return;
    try {
      const { data } = await api.get(`/insights/post/${mediaId.trim()}`, {
        params: { account_id: account.id },
      });
      setPostMetrics(data.metrics);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const seriesOf = (m) => (metrics?.[m]?.series || []).map((v) => v.value || 0);
  const labelsOf = (m) =>
    (metrics?.[m]?.series || []).map((v) => new Date(v.end_time).toLocaleDateString(undefined, { day: 'numeric', month: 'numeric' }));

  return (
    <div>
      <h1>Analytics</h1>
      {error && <div className="error">{error}</div>}
      {!account && <p className="muted">Connect an account from the Dashboard first.</p>}
      {account?.type !== 'page' && account && (
        <div className="notice">Page KPIs need a Facebook Page. You have selected an Instagram account — post-level IG insights work below.</div>
      )}
      {account?.type === 'page' && metrics && (
        <>
          <div className="grid">
            {Object.entries(metrics).map(([name, m]) => (
              <div className="card" key={name}>
                <div className="kpi">{m.total.toLocaleString()}</div>
                <div className="kpi-label">{name.replace('page_', '').replace(/_/g, ' ')} (28d)</div>
              </div>
            ))}
          </div>
          <div className="card">
            <h2>Impressions (last 28 days)</h2>
            <Chart values={seriesOf('page_impressions')} labels={labelsOf('page_impressions')} />
          </div>
        </>
      )}
      {account && (
        <div className="card">
          <h2>Post / media insights</h2>
          <p className="muted">
            Paste a {account.type === 'instagram' ? 'Instagram media id' : 'Facebook post id'} (e.g. from a published post in the Calendar).
          </p>
          <div className="row">
            <input style={{ maxWidth: 360 }} value={mediaId} onChange={(e) => setMediaId(e.target.value)} placeholder="post / media id" />
            <button className="primary" style={{ marginTop: 0 }} onClick={lookupPost}>Look up</button>
          </div>
          {postMetrics && (
            <table className="table" style={{ marginTop: 12 }}>
              <thead><tr><th>Metric</th><th>Value</th></tr></thead>
              <tbody>
                {postMetrics.map((m) => (
                  <tr key={m.name}>
                    <td>{m.name.replace(/_/g, ' ')}</td>
                    <td>{JSON.stringify(m.values?.[0]?.value ?? m.value ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
