import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/reception', label: 'FFB Reception', icon: '🚚' },
  { to: '/employees', label: 'Employees', icon: '👷' },
  { to: '/payroll', label: 'Payroll', icon: '💵' }
];

export default function NavBar() {
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
      </header>

      <nav className="bottombar">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `bottombar-link${isActive ? ' active' : ''}`}>
            <span className="bottombar-icon">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
