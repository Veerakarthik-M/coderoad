import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

const WORKFLOW_STEPS = [
  { step: '01', title: 'Student Registers', desc: 'Complete personal, college, and travel details in a guided step-by-step form.' },
  { step: '02', title: 'Institution Verifies', desc: 'College administrator reviews and approves the student eligibility and enrollment.' },
  { step: '03', title: 'Pass Issued', desc: 'KSRTC digitally signs the credential using ECDSA P-256. A QR code is generated.' },
  { step: '04', title: 'Conductor Scans', desc: 'The conductor scans the student QR. Verified online or offline under 2 seconds.' },
  { step: '05', title: 'Event Recorded', desc: 'Each verified scan creates a travel record. Offline events sync when internet returns.' },
  { step: '06', title: 'Institution Reviews', desc: 'Authorized administrators view their students pass status and verification history.' },
];

function HeroLoginPanel({ onAuth }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirect = (role) => {
    switch (role) {
      case 'student': navigate('/student'); break;
      case 'institution': navigate('/institution'); break;
      case 'admin': navigate('/admin'); break;
      case 'conductor': navigate('/conductor'); break;
      default: navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      onAuth(data.user, data.token);
      redirect(data.user.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero-login-panel">
      <div className="hero-login-panel__header">
        <h2 className="hero-login-panel__title">Sign in KSRTC Concession Application</h2>
      </div>
      <div className="hero-login-panel__body">
        {error && <div className="alert alert--error" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} noValidate>

          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label" htmlFor="hero-email" style={{ fontSize: '0.8125rem' }}>Email / Username</label>
            <input id="hero-email" type="text" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" style={{ fontSize: '0.875rem' }} required />
          </div>
          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <label className="form-label" htmlFor="hero-password" style={{ fontSize: '0.8125rem' }}>Password</label>
            <input id="hero-password" type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={{ fontSize: '0.875rem' }} required />
          </div>
          <button type="button" onClick={(e) => e.preventDefault()} style={{ fontSize: '0.8rem', color: 'var(--blue-600)', display: 'block', marginBottom: '1rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Forgot password?</button>
          <button type="submit" className="hero-login-panel__submit" id="hero-signin" disabled={loading}>
            {loading ? 'Signing in...' : 'SIGN IN'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          New student? <Link to="/register/student" style={{ color: 'var(--blue-600)', fontWeight: '600' }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}

export default function Landing({ user, onAuth }) {
  return (
    <main>
      <section className="landing-hero" id="home">
        <img src="/ksrtc-bus.jpg" alt="Kerala KSRTC Bus" className="landing-hero__bg" />
        <div className="landing-hero__overlay"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2, paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
          <div className="landing-hero__two-col">
            <div className="landing-hero__left">
              <div className="hero-action-group">
                <h3 className="hero-action-group__title">Quick Links</h3>
                <Link to="/downloads" className="hero-cta-btn hero-cta-btn--orange">Forms & Downloads</Link>
                <Link to="/about" className="hero-cta-btn hero-cta-btn--teal">About Portal</Link>
              </div>
              <div className="hero-action-group">
                <h3 className="hero-action-group__title">Apply For New Student Concession</h3>
                <Link to="/register/student" className="hero-cta-btn hero-cta-btn--orange" id="hero-school-register">School Students Registration</Link>
                <Link to="/register/student" className="hero-cta-btn hero-cta-btn--orange" id="hero-college-register">College Students Registration</Link>
              </div>
              <div className="hero-action-group">
                <h3 className="hero-action-group__title">Institution Registration</h3>
                <Link to="/register/institution" className="hero-cta-btn hero-cta-btn--orange" id="hero-school-inst-register">School Registration</Link>
                <Link to="/register/institution" className="hero-cta-btn hero-cta-btn--orange" id="hero-college-inst-register">College Registration</Link>
              </div>
              <div className="hero-action-group">
                <Link to="/conductor" className="hero-cta-btn hero-cta-btn--teal" id="hero-conductor">Conductor Scanner</Link>
              </div>
            </div>
            <div className="landing-hero__right">
              {user ? (
                <div className="hero-login-panel">
                  <div className="hero-login-panel__header"><h2 className="hero-login-panel__title">Welcome back!</h2></div>
                  <div className="hero-login-panel__body" style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>You are signed in as <strong>{user.email}</strong></p>
                    <Link to={`/${user.role}`} className="hero-login-panel__submit" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>Go to Dashboard</Link>
                  </div>
                </div>
              ) : (
                <HeroLoginPanel onAuth={onAuth || (() => {})} />
              )}
            </div>
          </div>
        </div>
      </section>



      <section id="contact" style={{ padding: '4rem 2rem', background: '#ffffff', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: '2rem', color: '#064e3b', marginBottom: '1rem' }}>Contact KSRTC</h2>
          <p style={{ color: '#4b5563', marginBottom: '0.5rem' }}>For any queries regarding the portal, please contact the KSRTC control room:</p>
          <p style={{ fontWeight: 600, color: '#1f2937', fontSize: '1.25rem' }}>Phone: 0471-2463799 / 9447071021</p>
          <p style={{ color: '#4b5563' }}>Email: <a href="mailto:rsnksrtc@kerala.gov.in" style={{ color: '#047857' }}>rsnksrtc@kerala.gov.in</a></p>
        </div>
      </section>

    </main>
  );
}
