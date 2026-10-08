import React from 'react';

/** Pick one of the user's Pages / Instagram accounts. */
export default function AccountSwitcher({ accounts, value, onChange }) {
  if (!accounts?.length) return <p className="muted">No accounts connected. Sync from the Dashboard.</p>;
  return (
    <div className="account-pick">
      {accounts.map((a) => (
        <button
          key={a.id}
          className={value === a.id ? 'sel' : ''}
          onClick={() => onChange(a.id)}
        >
          {a.type === 'instagram' ? '📸 ' : '📄 '}{a.name}
        </button>
      ))}
    </div>
  );
}
