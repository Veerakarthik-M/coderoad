import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ user, onLogout }) {
  const location = useLocation();

  if (!user) return null;

  const getRoleLabel = () => {
    switch (user.role) {
      case 'student': return 'Student';
      case 'institution': return 'Institution';
      case 'admin': return 'System Admin';
      case 'conductor': return 'Conductor';
      default: return user.role;
    }
  };

  const navItems = [];

  if (user.role === 'student') {
    navItems.push({ label: 'Dashboard', path: '/student', icon: '📊' });
    navItems.push({ label: 'My Pass', path: '/student/pass', icon: '🎫' });
  } else if (user.role === 'institution') {
    navItems.push({ label: 'Dashboard', path: '/institution', icon: '🏫' });
  } else if (user.role === 'admin') {
    navItems.push({ label: 'Dashboard', path: '/admin', icon: '⚙️' });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <Link to="/" className="sidebar__logo">
          <div className="sidebar__logo-icon">A</div>
          <div>
            <div>ANAVANDI</div>
            <div className="sidebar__role-badge">{getRoleLabel()}</div>
          </div>
        </Link>
      </div>
      
      <div className="sidebar__user">
        <div className="sidebar__user-name">{user.name}</div>
        <div className="sidebar__user-email">{user.email}</div>
      </div>

      <nav className="sidebar__nav">
        <div className="sidebar__section-label">Menu</div>
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar__item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar__item-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button onClick={onLogout} className="sidebar__logout">
          <span className="sidebar__item-icon">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
