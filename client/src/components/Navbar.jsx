import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const location = useLocation();

  // Full-screen conductor experience — no navbar
  if (location.pathname === '/conductor') return null;

  const getDashboardLink = () => {
    if (!user) return null;
    switch (user.role) {
      case 'student': return '/student';
      case 'institution': return '/institution';
      case 'admin': return '/admin';
      case 'conductor': return '/conductor';
      default: return '/';
    }
  };

  const getRoleLabel = () => {
    if (!user) return '';
    switch (user.role) {
      case 'student': return 'Student';
      case 'institution': return 'Institution';
      case 'admin': return 'KSRTC Admin';
      case 'conductor': return 'Conductor';
      default: return user.role;
    }
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" aria-label="ANAVANDI home">
          <div className="navbar__logo" aria-hidden="true">A</div>
          <div className="navbar__brand-text">
            <div className="navbar__brand-name">ANAVANDI</div>
            <div className="navbar__brand-tagline">Digital Concession Pass</div>
          </div>
        </Link>

        <div className="navbar__nav" role="menubar">
          {!user && (
            <>
              <Link
                to="/login"
                className={`navbar__link${location.pathname === '/login' ? ' navbar__link--active' : ''}`}
                role="menuitem"
              >
                Sign In
              </Link>
              <Link to="/register/student" className="btn btn--primary btn--sm" role="menuitem">
                Apply Now
              </Link>
            </>
          )}

          {user && (
            <>
              <Link
                to={getDashboardLink()}
                className={`navbar__link${location.pathname.startsWith(getDashboardLink()) ? ' navbar__link--active' : ''}`}
                role="menuitem"
              >
                Dashboard
              </Link>
              {user.role === 'student' && (
                <Link
                  to="/student/pass"
                  className={`navbar__link${location.pathname === '/student/pass' ? ' navbar__link--active' : ''}`}
                  role="menuitem"
                >
                  My Pass
                </Link>
              )}
              <div className="navbar__user-info" aria-label={`Logged in as ${user.name}`}>
                <span className="navbar__user-role">{getRoleLabel()}</span>
                <span className="navbar__user-name">{user.name}</span>
              </div>
              <button onClick={onLogout} className="btn btn--ghost btn--sm" id="navbar-logout-btn">
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
