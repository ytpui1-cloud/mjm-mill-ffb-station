import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../roles.js';

const ALL_LINKS = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true, roles: null },
  { to: '/reception', label: 'FFB Reception', icon: '🚚', roles: null },
  { to: '/employees', label: 'Employees', icon: '👷', roles: ['assistant_station_head', 'station_head', 'manager'] },
  { to: '/payroll', label: 'Payroll', icon: '💵', roles: null },
  { to: '/team', label: 'Team & Roles', icon: '🛡️', roles: ['manager'] }
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = ALL_LINKS.filter((l) => !l.roles || l.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">MJM</span>
          <span className="brand-sub">Mill · FFB Reception Station</span>
        </div>
        <nav className="topbar-links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-user">
          <span className="user-role">{user.name} · {ROLE_LABELS[user.role]}</span>
          <button className="btn-link" onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      <nav className="bottombar">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `bottombar-link${isActive ? ' active' : ''}`}>
            <span className="bottombar-icon">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
        <button className="bottombar-link bottombar-logout" onClick={handleLogout}>
          <span className="bottombar-icon">🚪</span>
          <span>Log Out</span>
        </button>
      </nav>
    </>
  );
}
