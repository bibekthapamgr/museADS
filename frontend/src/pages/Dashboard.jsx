import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import AccountSwitcher from '../components/AccountSwitcher.jsx';

/** Account overview + sync. The chosen account is shared via localStorage. */
export const getAccountId = () => Number(localStorage.getItem('meta_account_id')) || null;
export const setAccountId = (id) => localStorage.setItem('meta_account_id', id);

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [accountId, setAid] = useState(getAccountId());

  const load = async () => {
    setError('');
    try {
      const { data } = await api.get('/accounts');
      setAccounts(data.accounts);
      if (data.accounts.length && !getAccountId()) {
        setAid(data.accounts[0].id);
        setAccountId(data.accounts[0].id);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const sync = async () => {
    setError('');
    try {
      const { data } = await api.post('/accounts/sync');
      setAccounts(data.accounts);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const pick = (id) => {
    setAid(id);
    setAccountId(id);
  };

  const selected = accounts.find((a) => a.id === accountId);

  return (
    <div>
      <h1>Dashboard</h1>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Connected accounts</h2>
          <button className="ghost" onClick={sync}>Re-sync from Meta</button>
        </div>
        <AccountSwitcher accounts={accounts} value={accountId} onChange={pick} />
        {selected && (
          <p className="muted" style={{ marginTop: 12 }}>
            Active: <b>{selected.name}</b> ({selected.type}) — used by Composer, Calendar & Analytics.
          </p>
        )}
      </div>
    </div>
  );
}
