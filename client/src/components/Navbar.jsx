import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Navbar({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  const hidePaths = ['/login', '/register', '/student', '/institution', '/admin', '/conductor'];
  if (hidePaths.some(path => location.pathname.startsWith(path))) return null;

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/');
      // wait for navigation then scroll
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="official-nav">
      {/* Top bar with logo + login buttons */}
      <div className="official-nav__topbar">
        <div className="official-nav__inner">
          <Link to="/" className="official-nav__brand">
            <div className="official-nav__emblem">
              <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.25rem', fontFamily: 'sans-serif' }}>A</span>
            </div>
            <div className="official-nav__brand-text">
              <span className="official-nav__brand-name">ANAVANDI</span>
              <span className="official-nav__brand-sub">Kerala KSRTC · Student Concession Portal</span>
            </div>
          </Link>
          <div className="official-nav__spacer" />
          <div className="official-nav__login-btns">
            {user ? (
              <Link to={`/${user.role}`} className="official-nav__login-btn official-nav__login-btn--primary">
                🏠 Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login/institution" className="official-nav__login-btn official-nav__login-btn--secondary" id="nav-school-login" title="College & School Login">
                  <span className="login-btn-full">🔒 Institution Admin</span>
                  <span className="login-btn-short">🔒 College</span>
                </Link>
                <Link to="/login/ksrtc" className="official-nav__login-btn official-nav__login-btn--primary" id="nav-ksrtc-login" title="KSRTC & Conductor Login">
                  <span className="login-btn-full">🔒 KSRTC / Conductor</span>
                  <span className="login-btn-short">🔒 KSRTC</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav links strip */}
      <div className="official-nav__links-bar">
        <div className="official-nav__inner">
          <div className="official-nav__links">
            <Link to="/" className="official-nav__link">Home</Link>
            <Link to="/downloads" className="official-nav__link">Downloads</Link>
            <Link to="/about" className="official-nav__link">About Portal</Link>
            <a href="#contact" className="official-nav__link" onClick={scrollTo('contact')}>Contact KSRTC</a>
          </div>
        </div>
      </div>
    </nav>
  );
}
