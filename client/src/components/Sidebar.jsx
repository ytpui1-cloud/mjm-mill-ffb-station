import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../roles.js';

const ALL_LINKS = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true, roles: null },
  { to: '/reception', label: 'FFB Reception', icon: '🚚', roles: null },
  { to: '/data-entry', label: 'Data Entry', icon: '✏️', roles: ['operator', 'assistant_station_head', 'station_head', 'manager'] },
  { to: '/my-earnings', label: 'My Earnings', icon: '💰', roles: null },
  { to: '/approvals', label: 'Approvals', icon: '✅', roles: ['assistant_station_head', 'station_head', 'manager'] },
  { to: '/work-history', label: 'Work History', icon: '🔄', roles: null },
  { to: '/stations', label: 'Stations', icon: '⚙️', roles: ['assistant_station_head', 'station_head', 'manager'] },
  { to: '/employees', label: 'Employees', icon: '👷', roles: ['assistant_station_head', 'station_head', 'manager'] },
  { to: '/piece-rates', label: 'Piece Rates', icon: '💲', roles: ['assistant_station_head', 'station_head', 'manager'] },
  { to: '/salary-rules', label: 'Salary Rules', icon: '🧮', roles: ['manager'] },
  { to: '/payroll', label: 'Payroll', icon: '💵', roles: null },
  { to: '/team', label: 'Team & Roles', icon: '🛡️', roles: ['manager'] }
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = ALL_LINKS.filter((l) => !l.roles || l.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <header className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
        <span className="mobile-topbar-brand">MJM Mill Payroll</span>
      </header>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">Mill Payroll</div>
          <div className="sidebar-brand-sub">Piece Rate System</div>
        </div>

        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-icon">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <span className="sidebar-user-avatar">{initials}</span>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-role">{ROLE_LABELS[user.role]}</span>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>Log Out</button>
        </div>
      </aside>
    </>
  );
}
