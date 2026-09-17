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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1 className="auth-card__title">Sign In</h1>
          <p className="auth-card__subtitle">ANAVANDI — Student Concession Pass</p>
        </div>

        {error && (
          <div className="alert alert--error" style={{ marginBottom: '1rem' }} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email or Username</label>
            <input
              id="login-email"
              type="text"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email or username"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
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
            className="btn btn--primary btn--full btn--lg"
            id="login-submit"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">Quick Login (Demo)</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {[
            { label: 'Student', email: 'karthik@student.com', id: 'quick-student' },
            { label: 'Institution', email: 'admin@amrita.edu', id: 'quick-institution' },
            { label: 'KSRTC Admin', email: 'admin@ksrtc.com', id: 'quick-admin' },
            { label: 'Conductor', email: 'conductor@ksrtc.com', id: 'quick-conductor' },
          ].map((acc) => (
            <button
              key={acc.id}
              id={acc.id}
              onClick={() => quickLogin(acc.email)}
              className="btn btn--outline btn--sm"
              disabled={loading}
            >
              {acc.label}
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.375rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          New student?{' '}
          <Link to="/register/student">Register here</Link>
        </p>
      </div>
    </div>
  );
}
