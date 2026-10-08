import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import PostCard from '../components/PostCard.jsx';

/** Scheduled / published / failed post queue. */
export default function Calendar() {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const load = async (f = filter) => {
    setError('');
    try {
      const { data } = await api.get('/posts', { params: f ? { status: f } : {} });
      setPosts(data.posts);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  useEffect(() => { load(''); }, []);

  const changeFilter = (f) => { setFilter(f); load(f); };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this post?')) return;
    await api.delete(`/posts/${id}`);
    load(filter);
  };

  return (
    <div>
      <h1>Calendar</h1>
      {error && <div className="error">{error}</div>}
      <div className="row" style={{ marginBottom: 14 }}>
        {['', 'scheduled', 'published', 'failed'].map((f) => (
          <button key={f} className={`ghost${filter === f ? '' : ''}`} onClick={() => changeFilter(f)}
            style={filter === f ? { borderColor: '#1877f2', background: '#e7f0fe' } : {}}>
            {f === '' ? 'All' : f}
          </button>
        ))}
      </div>
      {posts.length === 0 && <p className="muted">Nothing here yet — head to the Composer.</p>}
      {posts.map((p) => <PostCard key={p.id} post={p} onCancel={cancel} />)}
    </div>
  );
}
