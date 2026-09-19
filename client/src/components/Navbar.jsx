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
          <Link to="/" className="official-nav__brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div className="official-nav__emblem" style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
              <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.25rem', fontFamily: 'sans-serif' }}>A</span>
            </div>
            <div className="official-nav__brand-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="official-nav__brand-name" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#064e3b', letterSpacing: '0.04em', lineHeight: 1.1 }}>ANAVANDI</span>
              <span className="official-nav__brand-sub" style={{ fontSize: '0.75rem', color: '#4b5563', fontWeight: 600 }}>Kerala KSRTC · Student Concession Portal</span>
            </div>
          </Link>
          <div className="official-nav__spacer" />
          <div className="official-nav__login-btns" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {user ? (
              <Link to={`/${user.role}`} style={{ background: '#047857', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                🏠 Go to Dashboard ({user.role.toUpperCase()})
              </Link>
            ) : (
              <>
                <Link to="/login/institution" style={{ background: '#ffffff', color: '#1f2937', border: '1px solid #d1d5db', padding: '0.5rem 0.875rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.8125rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem' }} id="nav-school-login">
                  🏫 School / College Login
                </Link>
                <Link to="/login/ksrtc" style={{ background: '#047857', color: '#ffffff', padding: '0.5rem 0.875rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.8125rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem' }} id="nav-ksrtc-login">
                  🚌 KSRTC Official Login
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
            <a href="#downloads" className="official-nav__link" onClick={scrollTo('downloads')}>Downloads</a>
            <a href="#about" className="official-nav__link" onClick={scrollTo('about')}>About Portal</a>
            <a href="#contact" className="official-nav__link" onClick={scrollTo('contact')}>Contact KSRTC</a>
          </div>
        </div>
      </div>
    </nav>
  );
}
