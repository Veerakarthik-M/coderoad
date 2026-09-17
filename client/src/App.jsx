import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from './api';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import StudentRegister from './pages/StudentRegister';
import StudentDashboard from './pages/StudentDashboard';
import StudentPass from './pages/StudentPass';
import InstitutionRegister from './pages/InstitutionRegister';
import InstitutionDashboard from './pages/InstitutionDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ConductorVerifier from './pages/ConductorVerifier';
import './index.css';

function ProtectedRoute({ children, role }) {
  const user = api.getUser();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
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
        <Route path="/" element={<Landing user={user} />} />
        <Route path="/login" element={<Login onAuth={handleAuth} />} />
        <Route path="/register/student" element={<StudentRegister onAuth={handleAuth} />} />
        <Route path="/register/institution" element={<InstitutionRegister onAuth={handleAuth} />} />
        
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
        
        <Route path="/conductor" element={<ConductorVerifier />} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
