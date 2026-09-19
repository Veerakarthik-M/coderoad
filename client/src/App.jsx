import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { api } from './api';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import StudentRegister from './pages/StudentRegister';
import StudentDashboard from './pages/StudentDashboard';
import StudentPass from './pages/StudentPass';
import InstitutionRegister from './pages/InstitutionRegister';
import InstitutionDashboard from './pages/InstitutionDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ConductorVerifier from './pages/ConductorVerifier';
import Downloads from './pages/Downloads';
import About from './pages/About';
import './index.css';

function ProtectedRoute({ children, role }) {
  const user = api.getUser();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

function AppShell({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (!user) return <Outlet />;
  
  return (
    <div className="app-shell">
      <div className="app-shell__mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          ☰ Menu
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name || user.email}
          </span>
          <button
            onClick={onLogout}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            id="mobile-header-logout"
          >
            🚪 Logout
          </button>
        </div>
      </div>
      <div className={`app-shell__sidebar ${sidebarOpen ? 'app-shell__sidebar--open' : ''}`}>
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
        <div className="sidebar-content-wrapper" onClick={() => setSidebarOpen(false)}>
          <Sidebar user={user} onLogout={onLogout} />
        </div>
      </div>
      <div className="app-shell__main">
        <div className="app-shell__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(api.getUser());

  const handleAuth = (userData, token) => {
    api.setToken(token);
    api.setUser(userData);
    setUser(userData);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Landing user={user} onAuth={handleAuth} onLogout={handleLogout} />} />
        <Route path="/login" element={<Login onAuth={handleAuth} />} />
        <Route path="/login/institution" element={<Login portal="institution" onAuth={handleAuth} />} />
        <Route path="/login/ksrtc" element={<Login portal="ksrtc" onAuth={handleAuth} />} />
        <Route path="/register/student" element={<StudentRegister onAuth={handleAuth} />} />
        <Route path="/register/institution" element={<InstitutionRegister onAuth={handleAuth} />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/about" element={<About />} />
        
        {/* App Shell for Dashboards */}
        <Route element={<AppShell user={user} onLogout={handleLogout} />}>
          <Route path="/student" element={
            <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/student/pass" element={
            <ProtectedRoute role="student"><StudentPass /></ProtectedRoute>
          } />
          
          <Route path="/institution" element={
            <ProtectedRoute role="institution"><InstitutionDashboard /></ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />
        </Route>
        
        {/* Conductor app runs standalone */}
        <Route path="/conductor" element={<ConductorVerifier onLogout={handleLogout} />} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

