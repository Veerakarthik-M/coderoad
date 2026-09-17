import { useState, useEffect } from 'react';
import { api } from '../api';

export default function InstitutionDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const user = api.getUser();

  useEffect(() => { loadApplications(); }, []);

  const loadApplications = async () => {
    try {
      const data = await api.get('/institution/applications');
      setApplications(data.applications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/institution/approve/${id}`);
      loadApplications();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    setActionLoading(id);
    try {
      await api.post(`/institution/reject/${id}`, { reason });
      loadApplications();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div>Loading...</div>;

  const pending = applications.filter(a => a.status === 'pending');
  const others = applications.filter(a => a.status !== 'pending');

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Institution Dashboard</h1>
          <p className="page-subtitle">Review and approve student concession applications</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
              {pending.length}
            </div>
            <div className="stat-label">Pending Review</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
              {applications.filter(a => ['inst_approved', 'approved', 'issued'].includes(a.status)).length}
            </div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
              {applications.filter(a => a.status === 'rejected').length}
            </div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{applications.length}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>

        {/* Pending Applications */}
        {pending.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              ⏳ Pending Applications
            </h2>
            {pending.map(app => (
              <div key={app.id} className="card" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{app.student_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                      Roll: {app.roll_no} · {app.course} · {app.route_from} → {app.route_to} ({app.distance_km}km)
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      📧 {app.student_email} · 📞 {app.student_phone}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleApprove(app.id)}
                      disabled={actionLoading === app.id}
                    >
                      {actionLoading === app.id ? '...' : '✓ Approve'}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleReject(app.id)}
                      disabled={actionLoading === app.id}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pending.length === 0 && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">No Pending Applications</div>
              <div className="empty-state-description">All student applications have been reviewed.</div>
            </div>
          </div>
        )}

        {/* All Applications Table */}
        {others.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              📋 All Applications
            </h2>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll No</th>
                    <th>Course</th>
                    <th>Route</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {others.map(app => (
                    <tr key={app.id}>
                      <td style={{ fontWeight: 600 }}>{app.student_name}</td>
                      <td>{app.roll_no}</td>
                      <td>{app.course}</td>
                      <td style={{ fontSize: '0.85rem' }}>{app.route_from} → {app.route_to}</td>
                      <td>
                        <span className={`badge ${
                          app.status === 'inst_approved' ? 'badge-approved' :
                          app.status === 'issued' ? 'badge-issued' :
                          app.status === 'rejected' ? 'badge-rejected' : 'badge-pending'
                        }`}>
                          {app.status === 'inst_approved' ? 'Approved' : app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
