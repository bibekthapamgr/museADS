import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setUserId } from '../api.js';

/** Connect screen: starts OAuth, then stores the internal user id. */
export default function Login() {
  const [userId, setUid] = useState('');
  const navigate = useNavigate();

  const save = () => {
    if (!userId.trim()) return;
    setUserId(userId.trim());
    navigate('/');
  };

  return (
    <div className="login-wrap">
      <h1>Meta Platform</h1>
      <p className="muted">Manage posts, insights and ads across Facebook & Instagram.</p>
      <a href="/auth/login"><button className="primary">Connect with Facebook</button></a>
      <div className="card" style={{ marginTop: 24, textAlign: 'left' }}>
        <h2>After connecting</h2>
        <p className="muted">
          The OAuth callback page shows your internal user id. Paste it here
          (demo auth — replace with sessions in production):
        </p>
        <input placeholder="User id from callback page" value={userId} onChange={(e) => setUid(e.target.value)} />
        <button className="primary" onClick={save}>Save user id</button>
      </div>
    </div>
  );
}
