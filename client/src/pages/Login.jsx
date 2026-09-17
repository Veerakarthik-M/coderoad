import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function Login({ onAuth }) {
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

  return (
    <div className="login-shell">
      <div className="login-left">
        <img src="/ksrtc-bus.jpg" alt="KSRTC Bus" className="login-left__bg" />
        <div className="login-left__overlay"></div>
        <div className="login-left__content">
          <h2 className="login-left__quote">"Empowering students with seamless digital transit."</h2>
          <p className="login-left__sub">Official Portal of Kerala State Road Transport Corporation</p>
        </div>
      </div>
      
      <div className="login-right">
        <div className="login-logo">
          <div className="login-logo__icon">A</div>
          <div>
            <div className="login-logo__name">ANAVANDI</div>
            <div className="login-logo__tagline">Student Concession Pass</div>
          </div>
        </div>

        <div>
          <h1 className="login-form__title">Welcome back</h1>
          <p className="login-form__subtitle">Sign in to your account to continue</p>
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
              placeholder="name@example.com"
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
            style={{ width: '100%', justifyContent: 'center' }}
            id="login-submit"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <div className="divider">or quick login (demo)</div>

        <div className="quick-logins">
          {[
            { label: 'karthik@student.in', role: 'Student', email: 'karthik@student.in', id: 'quick-student' },
            { label: 'admin@amrita.edu', role: 'Institution', email: 'admin@amrita.edu', id: 'quick-institution' },
            { label: 'admin@ksrtc.in', role: 'Admin', email: 'admin@ksrtc.in', id: 'quick-admin' },
            { label: 'conductor1@ksrtc.in', role: 'Conductor', email: 'conductor1@ksrtc.in', id: 'quick-conductor' },
          ].map((acc) => (
            <button
              key={acc.id}
              id={acc.id}
              onClick={() => quickLogin(acc.email)}
              className="quick-login-btn"
              disabled={loading}
              type="button"
            >
              <span className="quick-login-btn__role">{acc.role}</span>
              {acc.label}
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          New student?{' '}
          <Link to="/register/student" style={{ color: 'var(--blue-600)', fontWeight: '600' }}>Apply for a Pass</Link>
        </p>
      </div>
    </div>
  );
}
