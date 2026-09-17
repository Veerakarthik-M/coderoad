import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ user }) {
  const location = useLocation();

  // Hide TopNav on auth routes, dashboards, and conductor verifier
  const hidePaths = ['/login', '/register', '/student', '/institution', '/admin', '/conductor'];
  if (hidePaths.some(path => location.pathname.startsWith(path))) return null;

  return (
    <nav className="top-nav">
      <div className="top-nav__inner">
        <Link to="/" className="top-nav__logo">
          <div className="top-nav__logo-icon">A</div>
          <span>ANAVANDI</span>
        </Link>
        <div className="top-nav__spacer"></div>
        <div className="top-nav__links">
          {user ? (
            <Link to={`/${user.role}`} className="top-nav__link">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="top-nav__link">Sign In</Link>
              <Link to="/register/student" className="btn btn--white btn--sm" style={{ marginLeft: '0.5rem' }}>
                Apply Now
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
