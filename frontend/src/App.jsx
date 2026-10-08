import React from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Composer from './pages/Composer.jsx';
import Calendar from './pages/Calendar.jsx';
import Analytics from './pages/Analytics.jsx';
import Ads from './pages/Ads.jsx';
import Settings from './pages/Settings.jsx';
import { getUserId, clearUserId } from './api.js';

function Shell({ children }) {
  const navigate = useNavigate();
  const logout = () => {
    clearUserId();
    navigate('/login');
  };
  return (
    <div className="shell">
      <nav className="nav">
        <span className="brand">Meta Platform</span>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/compose">Composer</NavLink>
        <NavLink to="/calendar">Calendar</NavLink>
        <NavLink to="/analytics">Analytics</NavLink>
        <NavLink to="/ads">Ads</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        <button className="link" onClick={logout}>Disconnect</button>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}

function Guard({ children }) {
  if (!getUserId()) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Guard><Dashboard /></Guard>} />
      <Route path="/compose" element={<Guard><Composer /></Guard>} />
      <Route path="/calendar" element={<Guard><Calendar /></Guard>} />
      <Route path="/analytics" element={<Guard><Analytics /></Guard>} />
      <Route path="/ads" element={<Guard><Ads /></Guard>} />
      <Route path="/settings" element={<Guard><Settings /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
