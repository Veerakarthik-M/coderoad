import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function Login({ portal: propPortal, onAuth }) {
  const navigate = useNavigate();
  const [activePortal, setActivePortal] = useState(propPortal || 'student');
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

  const quickLogin = async (em) => {
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email: em, password: 'demo123' });
      onAuth(data.user, data.token);
      redirect(data.user.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isInstitution = activePortal === 'institution';
  const isKsrtc = activePortal === 'ksrtc';

  return (
    <div className="login-shell">
      <div className="login-left">
        <img 
          src={isInstitution ? "/inst_bg.jpg" : isKsrtc ? "/ksrtc_bg.jpg" : "/student_bg.jpg"} 
          alt="KSRTC Background" 
          className="login-left__bg" 
        />
        <div className="login-left__overlay"></div>
        <div className="login-left__content">
          <h2 className="login-left__quote">
            {isInstitution 
              ? '"Streamlining student verification for educational institutions across Kerala."' 
              : isKsrtc 
              ? '"Empowering KSRTC officials and conductors with instant digital pass validation."' 
              : '"Empowering students with seamless digital transit."'
            }
          </h2>
          <p className="login-left__sub">Official Portal of Kerala State Road Transport Corporation</p>
        </div>
      </div>
      
      <div className="login-right">
        {/* Portal Switcher Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', background: '#f3f4f6', padding: '4px', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setActivePortal('student')}
            style={{
              flex: 1,
              padding: '0.4rem 0.5rem',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: activePortal === 'student' ? '#ffffff' : 'transparent',
              color: activePortal === 'student' ? '#064e3b' : '#6b7280',
              boxShadow: activePortal === 'student' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer'
            }}
          >
            🎓 Student
          </button>
          <button
            type="button"
            onClick={() => setActivePortal('institution')}
            style={{
              flex: 1,
              padding: '0.4rem 0.5rem',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: isInstitution ? '#ffffff' : 'transparent',
              color: isInstitution ? '#059669' : '#6b7280',
              boxShadow: isInstitution ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer'
            }}
          >
            🔒 Institution Admin
          </button>
          <button
            type="button"
            onClick={() => setActivePortal('ksrtc')}
            style={{
              flex: 1,
              padding: '0.4rem 0.5rem',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: isKsrtc ? '#ffffff' : 'transparent',
              color: isKsrtc ? '#064e3b' : '#6b7280',
              boxShadow: isKsrtc ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer'
            }}
          >
            🔒 KSRTC / Conductor
          </button>
        </div>

        <div className="login-logo">
          <div className="login-logo__icon" style={{ background: isInstitution ? '#059669' : '#064e3b' }}>
            {isInstitution ? '🏫' : isKsrtc ? '🚌' : 'A'}
          </div>
          <div>
            <div className="login-logo__name">ANAVANDI</div>
            <div className="login-logo__tagline" style={{ fontWeight: 600, color: isInstitution ? '#059669' : '#064e3b' }}>
              {isInstitution ? 'Institution Admin Portal' : isKsrtc ? 'KSRTC & Conductor Portal' : 'Student Concession Pass'}
            </div>
          </div>
        </div>

        <div>
          <h1 className="login-form__title">
            {isInstitution ? 'Institution Admin Sign In' : isKsrtc ? 'KSRTC & Conductor Sign In' : 'Student Sign In'}
          </h1>
          <p className="login-form__subtitle">
            {isInstitution ? 'Sign in as an institution admin to verify & approve student pass applications' : isKsrtc ? 'KSRTC admins & bus conductors sign in here to manage and verify passes' : 'Sign in to access your digital concession pass'}
          </p>
        </div>

        {error && (
          <div className="alert alert--error" style={{ marginBottom: '1.5rem' }} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email or Username <span className="req">*</span></label>
            <input
              id="login-email"
              type="text"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isInstitution ? 'admin@amrita.edu' : isKsrtc ? 'admin@ksrtc.in' : 'name@example.com'}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="login-password">Password <span className="req">*</span></label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: '100%', justifyContent: 'center', background: isInstitution ? '#059669' : '#064e3b' }}
            id="login-submit"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : isInstitution ? 'Sign In as Institution Admin' : isKsrtc ? 'Sign In to KSRTC Portal' : 'Sign In'}
          </button>
        </form>

        <div className="divider">quick demo access</div>

        <div className="quick-logins">
          {isInstitution ? (
            <button
              id="quick-institution"
              onClick={() => quickLogin('admin@amrita.edu')}
              className="quick-login-btn"
              style={{ border: '2px solid #059669', background: '#ecfdf5', gridColumn: '1 / -1' }}
              disabled={loading}
              type="button"
            >
              <span className="quick-login-btn__role" style={{ color: '#059669', fontWeight: 800 }}>🏫 Institution Admin (Demo)</span>
              admin@amrita.edu
            </button>
          ) : isKsrtc ? (
            <>
              <button
                id="quick-admin"
                onClick={() => quickLogin('admin@ksrtc.in')}
                className="quick-login-btn"
                style={{ border: '2px solid #064e3b', background: '#f0fdf4' }}
                disabled={loading}
                type="button"
              >
                <span className="quick-login-btn__role" style={{ color: '#064e3b', fontWeight: 800 }}>🚌 KSRTC Admin</span>
                admin@ksrtc.in
              </button>
              <button
                id="quick-conductor"
                onClick={() => quickLogin('conductor1@ksrtc.in')}
                className="quick-login-btn"
                style={{ border: '2px solid #d97706', background: '#fefce8' }}
                disabled={loading}
                type="button"
              >
                <span className="quick-login-btn__role" style={{ color: '#d97706', fontWeight: 800 }}>📱 Bus Conductor</span>
                conductor1@ksrtc.in
              </button>
            </>
          ) : (
            <button
              id="quick-student"
              onClick={() => quickLogin('karthik@student.in')}
              className="quick-login-btn"
              style={{ border: '2px solid #2563eb', background: '#eff6ff', gridColumn: '1 / -1' }}
              disabled={loading}
              type="button"
            >
              <span className="quick-login-btn__role" style={{ color: '#2563eb', fontWeight: 800 }}>🎓 Student (Demo)</span>
              karthik@student.in
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {isInstitution ? (
            <>New institution? <Link to="/register/institution" style={{ color: '#059669', fontWeight: '600' }}>Register Your Institution</Link></>
          ) : (
            <>New student? <Link to="/register/student" style={{ color: 'var(--blue-600)', fontWeight: '600' }}>Apply for a Pass</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
