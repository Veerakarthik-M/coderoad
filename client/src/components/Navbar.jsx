import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const location = useLocation();
  
  // Hide navbar on conductor page (full-screen experience)
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

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo">A</div>
          <div>
            <div className="navbar-title">ANAVANDI</div>
            <div className="navbar-subtitle">Digital Concession Pass</div>
          </div>
        </Link>

        <div className="navbar-links">
          {!user && (
            <>
              <Link to="/login" className={`navbar-link ${location.pathname === '/login' ? 'active' : ''}`}>
                Sign In
              </Link>
              <Link to="/register/student" className="btn btn-primary btn-sm">
                Apply Now
              </Link>
            </>
          )}

          {user && (
            <div className="navbar-user">
              <Link to={getDashboardLink()} className="navbar-link active">
                Dashboard
              </Link>
              {user.role === 'student' && (
                <Link to="/student/pass" className="navbar-link">
                  My Pass
                </Link>
              )}
              <span className="navbar-user-role">{user.role}</span>
              <span className="navbar-user-name">{user.name}</span>
              <button onClick={onLogout} className="btn btn-ghost btn-sm">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
