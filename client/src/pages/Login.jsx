import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function Login({ onAuth }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post('/auth/login', { email, password });
      onAuth(data.user, data.token);
      
      // Redirect based on role
      switch (data.user.role) {
        case 'student': navigate('/student'); break;
        case 'institution': navigate('/institution'); break;
        case 'admin': navigate('/admin'); break;
        case 'conductor': navigate('/conductor'); break;
        default: navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email) => {
    setEmail(email);
    setPassword('demo123');
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password: 'demo123' });
      onAuth(data.user, data.token);
      switch (data.user.role) {
        case 'student': navigate('/student'); break;
        case 'institution': navigate('/institution'); break;
        case 'admin': navigate('/admin'); break;
        case 'conductor': navigate('/conductor'); break;
        default: navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon" style={{ background: 'var(--gradient-primary)' }}>🔐</div>
          <h1 className="auth-card-title">Sign In</h1>
          <p className="auth-card-subtitle">KSRTC Concession Application</p>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email / Username</label>
            <input
              type="text"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email or username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">or quick login</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button onClick={() => quickLogin('karthik@student.com')} className="btn btn-outline btn-sm">
            🎓 Student
          </button>
          <button onClick={() => quickLogin('admin@amrita.edu')} className="btn btn-outline btn-sm">
            🏫 Institution
          </button>
          <button onClick={() => quickLogin('admin@ksrtc.com')} className="btn btn-outline btn-sm">
            🏛️ KSRTC Admin
          </button>
          <button onClick={() => quickLogin('conductor@ksrtc.com')} className="btn btn-outline btn-sm">
            🚌 Conductor
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          New student? <Link to="/register/student">Register here</Link>
          <br />
          Institution? <Link to="/register/institution">Register your school/college</Link>
        </div>
      </div>
    </div>
  );
}
