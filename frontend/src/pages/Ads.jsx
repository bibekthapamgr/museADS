import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Chart from '../components/Chart.jsx';

/** Ad accounts → campaigns (pause/resume) → guided create wizard → insights. */
const OBJECTIVES = ['OUTCOME_ENGAGEMENT', 'OUTCOME_SALES', 'OUTCOME_LEADS', 'OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_APP_PROMOTION'];

export default function Ads() {
  const [adAccounts, setAdAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState('');
  const [wizard, setWizard] = useState(false);
  const [form, setForm] = useState({ name: '', objective: 'OUTCOME_ENGAGEMENT', budget: '', page_id: '' });

  const loadAccounts = async () => {
    setError('');
    try {
      const { data } = await api.get('/ads/accounts');
      setAdAccounts(data.ad_accounts);
      if (data.ad_accounts.length && !accountId) setAccountId(data.ad_accounts[0].account_id);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const loadCampaigns = async (act = accountId) => {
    if (!act) return;
    try {
      const { data } = await api.get('/ads/campaigns', { params: { account_id: act } });
      setCampaigns(data.campaigns);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const loadInsights = async (act = accountId) => {
    if (!act) return;
    try {
      const { data } = await api.get('/ads/insights', { params: { account_id: act, level: 'campaign' } });
      setInsights(data.insights);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => {
    if (accountId) { loadCampaigns(accountId); loadInsights(accountId); }
  }, [accountId]);

  const toggle = async (c) => {
    const next = c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    if (!window.confirm(`${next === 'ACTIVE' ? 'Resume' : 'Pause'} "${c.name}"?`)) return;
    await api.patch(`/ads/campaigns/${c.id}`, { status: next });
    loadCampaigns();
  };

  const create = async () => {
    setError('');
    if (!form.name.trim()) return setError('Campaign name is required.');
    try {
      await api.post('/ads/campaigns', {
        account_id: accountId,
        campaign: { name: form.name, objective: form.objective, status: 'PAUSED' },
        // Minimal ad set; extend the wizard with targeting/budget fields as needed.
        adset: form.page_id
          ? { name: `${form.name} — ad set`, daily_budget: String(Number(form.budget || 500) * 100),
              billing_event: 'IMPRESSIONS', optimization_goal: 'REACH',
              targeting: { geo_locations: { countries: ['US'] } }, promoted_object: { page_id: form.page_id } }
          : undefined,
      });
      setWizard(false);
      setForm({ name: '', objective: 'OUTCOME_ENGAGEMENT', budget: '', page_id: '' });
      loadCampaigns();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  return (
    <div>
      <h1>Ads</h1>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <label>Ad account</label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {adAccounts.map((a) => (
            <option key={a.account_id} value={a.account_id}>{a.name} ({a.account_id})</option>
          ))}
        </select>
        <div className="row">
          <button className="primary" onClick={() => setWizard(!wizard)}>{wizard ? 'Close wizard' : 'New campaign'}</button>
        </div>
      </div>

      {wizard && (
        <div className="card">
          <h2>Create campaign (guided)</h2>
          <label>Campaign name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label>Objective</label>
          <select value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })}>
            {OBJECTIVES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <label>Daily budget (USD)</label>
          <input type="number" min="1" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="5" />
          <label>Promoted Page id (optional — enables the guided ad set)</label>
          <input value={form.page_id} onChange={(e) => setForm({ ...form, page_id: e.target.value })} placeholder="123456…" />
          <p className="muted">Created PAUSED. Full creative (images/copy) wiring lives in the backend guided call.</p>
          <button className="primary" onClick={create}>Create campaign</button>
        </div>
      )}

      <div className="card">
        <h2>Campaigns</h2>
        <table className="table">
          <thead><tr><th>Name</th><th>Objective</th><th>Status</th><th>Budget</th><th></th></tr></thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="muted">{c.objective}</td>
                <td><StatusBadge value={c.status} /></td>
                <td className="muted">{c.daily_budget ? `$${(c.daily_budget / 100).toFixed(2)}/day` : '—'}</td>
                <td><button className="ghost" onClick={() => toggle(c)}>{c.status === 'ACTIVE' ? 'Pause' : 'Resume'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {campaigns.length === 0 && <p className="muted">No campaigns in this account.</p>}
      </div>

      {insights.length > 0 && (
        <div className="card">
          <h2>Spend by campaign (30d)</h2>
          <Chart values={insights.map((i) => Number(i.spend || 0))} labels={insights.map((i) => (i.campaign_name || '').slice(0, 10))} color="#7c3aed" />
        </div>
      )}
    </div>
  );
}
