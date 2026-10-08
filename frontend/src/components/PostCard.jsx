import React from 'react';
import StatusBadge from './StatusBadge.jsx';

const fmt = (ts) => (ts ? new Date(ts * 1000).toLocaleString() : '—');

/** Card for one queued post. */
export default function PostCard({ post, onCancel }) {
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <StatusBadge value={post.status} />
        <span className="muted">{fmt(post.scheduled_at)}</span>
      </div>
      <p style={{ margin: '10px 0' }}>{post.message || <span className="muted">(no text)</span>}</p>
      {post.media_url && <p className="muted">Media: <a href={post.media_url} target="_blank" rel="noreferrer">{post.media_url.slice(0, 60)}…</a></p>}
      <p className="muted">Account: {post.account_name} ({post.account_type})</p>
      {post.error && <p className="error">{post.error}</p>}
      {(post.status === 'scheduled' || post.status === 'failed') && (
        <button className="ghost danger" onClick={() => onCancel(post.id)}>Cancel</button>
      )}
    </div>
  );
}
